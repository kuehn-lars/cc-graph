// Pure: the segments of a shell command and the folder each runs in (F02-R1, R8; F07-R17, R19).
import { isAbs, normalize } from './path'

/** `redirs`: indices of the unquoted words that are redirections (`2>&1`, `>file`). */
export type Segment = { words: string[]; sep: string; redirs: Set<number> }

/** The segments of a command, split on `|`, `&&`, `||`, `;` and newlines outside quotes. Words: quotes and backslashes honoured, nothing expanded. `sep`: the separator before the segment. A here-document (`<<EOF`, `<<-'EOF'`) is one redirection word, and its lines up to the delimiter are text, not segments (F02-R1). */
export function segments(command: string): Segment[] {
  const out: Segment[] = []
  let words: string[] = []
  let cur = ''
  let has = false
  let quote = ''
  let sep = ''
  let quoted = false
  let redirs = new Set<number>()
  const heredocs: { delim: string; strip: boolean }[] = [] // waiting for the end of the line
  const word = () => {
    if (has) (!quoted && /^(\d*|&)(>>?|<)/.test(cur) && redirs.add(words.length), words.push(cur))
    cur = ''
    has = false
    quoted = false
  }
  for (let i = 0; i < command.length; i++) {
    const c = command[i]!
    if (quote === "'") c === "'" ? (quote = '') : (cur += c)
    else if (quote === '"') {
      if (c === '"') quote = ''
      else if (c === '\\' && '"\\$`'.includes(command[i + 1] ?? ' ')) cur += command[++i]
      else cur += c
    } else if (c === '<' && command[i + 1] === '<' && command[i + 2] !== '<') {
      word()
      const strip = command[i + 2] === '-'
      i += strip ? 3 : 2
      while (command[i] === ' ' || command[i] === '\t') i++
      let delim = ''
      for (; i < command.length && !/[\s;|&<>()]/.test(command[i]!); i++) if (command[i] !== "'" && command[i] !== '"' && command[i] !== '\\') delim += command[i]
      i--
      redirs.add(words.length), words.push(`<<${delim}`)
      heredocs.push({ delim, strip })
    } else if (c === '\\') (cur += command[++i] ?? ''), (has = true), (quoted = true)
    else if (c === "'" || c === '"') (quote = c), (has = true), (quoted = true)
    else if (c === ';' || c === '|' || c === '\n' || (c === '&' && command[i + 1] === '&')) {
      word()
      out.push({ words, sep, redirs })
      words = []
      redirs = new Set()
      sep = c
      if (c !== ';' && c !== '\n' && command[i + 1] === c) (sep += c), i++
      if (c === '\n') for (const { delim, strip } of heredocs.splice(0)) { // the body: every line up to the one that is the delimiter
        for (;;) {
          const end = command.indexOf('\n', i + 1)
          const line = command.slice(i + 1, end < 0 ? command.length : end)
          i = end < 0 ? command.length : end
          if ((strip ? line.replace(/^\t+/, '') : line) === delim || end < 0) break
        }
      }
    } else if (/\s/.test(c)) word()
    else (cur += c), (has = true)
  }
  word()
  out.push({ words, sep, redirs })
  return out
}

/** F02-R8: the directory after segment `s`, given the one before it (`undefined`: the session's, `null`: unknown). Only a literal `cd <path>` ended by `&&` is known; a subshell, any other `cd` or separator is not. */
// ponytail: `cd a && make || rg …` is taken as in a; if the cd failed the search ran elsewhere. Needs a shell to know.
export function dirAfter(dir: string | null | undefined, s: Segment, next: string): string | null | undefined {
  const [cmd = '', path = ''] = s.words
  if (/^[({]/.test(cmd)) return null
  if (cmd !== 'cd') return dir
  if (s.words.length !== 2 || next !== '&&' || /[$`~*?[{\\]|^-/.test(path)) return null
  return isAbs(path) ? path : dir === null ? null : dir === undefined ? path : `${dir}/${path}`
}

/** F02-R8: the node path of `path` as a command run in `dir` names it (`undefined`: the session's `cwd`; a path: that of the `cd … &&` before it). */
export function resolve(path: string, dir: string | undefined, cwd: string): string {
  const join = (...p: (string | undefined)[]) => p.filter(Boolean).join('/') // cwd is '' before the session starts
  return normalize(isAbs(path) ? path : join(dir && isAbs(dir) ? dir : join(cwd, dir), path), cwd)
}

/** F07-R17: a predicate for the node paths a command names: a word of it, or a part of a word holding a `/` or a `.`, that resolves to the path, or to a folder that holds it. Redirection operators are stripped; a word the shell expands, or one in an unknown folder, names nothing. */
// ponytail: `.` resolves to '' and names nothing, so `prettier --write .` stays blind. Needs the folder's contents to say more.
export function namedPaths(command: string, cwd: string, start?: string): (path: string) => boolean {
  const names: string[] = []
  const segs = segments(command)
  if (segs.some(s => s.words[0] === 'patch' || s.words.slice(0, 2).join(' ') === 'git apply')) return () => true // Claude wrote or chose the patch
  let dir: string | null | undefined = start
  segs.forEach((s, i) => {
    if (dir !== null) for (const w of s.words) {
      if (w.startsWith('<<')) continue // a here-document's delimiter names nothing
      const word = w.replace(/^(\d*|&)(>>?|<)/, '')
      // A path-like part of a word: `open('src/gen.ts', 'w')` in a `python3 -c` names src/gen.ts.
      const parts = word.split(/[\s'"()[\]{},=:;]+/).filter(p => p !== word && /[/.]/.test(p))
      for (const name of [word, ...parts]) if (name && !/[$`~*?[{]/.test(name)) names.push(resolve(name, dir, cwd))
    }
    dir = dirAfter(dir, s, segs[i + 1]?.sep ?? '')
  })
  return path => names.some(n => n !== '' && (path === n || path.startsWith(`${n}/`)))
}

/** F07-R17: what each `mv ‹a› ‹b›` or `git mv ‹a› ‹b›` segment moved, as node paths: `‹b›`, and `‹b›/‹name of a›` for a folder, each to `‹a›`. */
export function moves(command: string, cwd: string, start?: string): Map<string, string> {
  const out = new Map<string, string>()
  const segs = segments(command)
  let dir: string | null | undefined = start
  segs.forEach((s, i) => {
    const at = s.words[0] === 'mv' ? 1 : s.words.slice(0, 2).join(' ') === 'git mv' ? 2 : -1
    const [a, b, ...more] = at < 0 ? [] : s.words.slice(at).filter(w => !w.startsWith('-'))
    if (dir !== null && a && b && !more.length && ![a, b].some(w => /[$`~*?[{]/.test(w))) {
      const from = resolve(a, dir, cwd)
      out.set(resolve(b, dir, cwd), from)
      out.set(resolve(`${b}/${a.split('/').pop()}`, dir, cwd), from)
    }
    dir = dirAfter(dir, s, segs[i + 1]?.sep ?? '')
  })
  return out
}

/** F07-R6: whether a segment runs `git stash`. Joined: a lone quoted git word in hooks/ makes check-calls.mjs ask for GIT_OPTIONAL_LOCKS (NFR-S5), and this runs nothing. */
export const stashes = (command: string) => segments(command).some(s => s.words.slice(0, 2).join(' ') === 'git stash')

/** The command as a reason names it: its first line, cut to 60 characters. */
export const cut = (command: string) => {
  const line = command.split('\n')[0]!
  return line.length > 60 ? `${line.slice(0, 59)}…` : line
}
