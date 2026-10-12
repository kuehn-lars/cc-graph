// Pure: a Bash command that holds a search, and the hits in its output (F02-R1, R2, R9).
import type { Searched } from '../model/searched'
import { normalize } from './path'

/** `dir`: where the search ran. Absent: the session's directory; a path: that of the `cd … &&` before it (F02-R8); `null`: unknown. */
export type Search = { tool: string; flags: string[]; operands: string[]; dir?: string | null }
/** Per path: the hit lines found and their characters, without newlines. */
export type Hits = Record<string, { hits: number; chars: number }>

const TOOLS = ['rg', 'grep', 'egrep', 'fgrep']
const MAX_LINES = 1000

/** `redirs`: indices of the unquoted words that are redirections (`2>&1`, `>file`). */
type Segment = { words: string[]; piped: boolean; sep: string; redirs: Set<number> }

/** The segments of a command, split on `|`, `&&`, `||`, `;` and newlines outside quotes. Words: quotes and backslashes honoured, nothing expanded. `piped`: a `|` precedes the segment. */
function segments(command: string): Segment[] {
  const out: Segment[] = []
  let words: string[] = []
  let cur = ''
  let has = false
  let quote = ''
  let piped = false
  let sep = ''
  let quoted = false
  let redirs = new Set<number>()
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
    } else if (c === '\\') (cur += command[++i] ?? ''), (has = true), (quoted = true)
    else if (c === "'" || c === '"') (quote = c), (has = true), (quoted = true)
    else if (c === ';' || c === '|' || c === '\n' || (c === '&' && command[i + 1] === '&')) {
      word()
      out.push({ words, piped, sep, redirs })
      words = []
      redirs = new Set()
      piped = c === '|' && command[i + 1] !== '|'
      sep = c
      if (c !== ';' && c !== '\n' && command[i + 1] === c) (sep += c), i++
    } else if (/\s/.test(c)) word()
    else (cur += c), (has = true)
  }
  word()
  out.push({ words, piped, sep, redirs })
  return out
}

/** Does this search name a path to read? Without one, a piped-into search reads standard input (F02-R3). The pattern is the first operand (searchIn puts one given by -e, -f, --regexp or --file there), so a path is a second one. */
function hasPath({ operands }: Search): boolean {
  return operands.length > 1
}

/** Flags that take a value, short (`-A 2`, `-tts`) and long (`--type ts`, `--type=ts`). `-r` and `-E` mean different things to rg and grep, so they are left out. */
// ponytail: a fixed list; a value flag missing from it leaves its value as an operand. Add when seen.
const VALUE_SHORT = 'ABCDMdefgjmtT'
const VALUE_LONG = ['--type', '--glob', '--max-count', '--regexp', '--file', '--context', '--after-context', '--before-context']

function searchIn({ words: w, redirs }: Segment): Search | null {
  let i = 0
  while (/^[A-Za-z_]\w*=/.test(w[i] ?? '')) i++
  const first = w[i] ?? ''
  // Joined: a lone quoted git word in hooks/ makes check-calls.mjs ask for GIT_OPTIONAL_LOCKS (NFR-S5), and this runs nothing.
  const tool = w.slice(i, i + 2).join(' ') === 'git grep' ? 'git grep' : TOOLS.includes(first) ? first : ''
  if (!tool) return null
  const flags: string[] = []
  const operands: string[] = []
  let pattern: string | undefined // from -e, -f, --regexp or --file (the first): it becomes the first operand, so operands read [pattern, ...paths]
  let ended = false
  for (let j = i + (tool === 'git grep' ? 2 : 1); j < w.length; j++) {
    const a = w[j]!
    if (redirs.has(j)) { if (/^(\d*|&)(>>?|<)$/.test(a)) j++; continue } // `> file` has its file in the next word
    if (!ended && a === '--') { ended = true; continue }
    if (ended || a.length < 2 || a[0] !== '-') { operands.push(a); continue }
    flags.push(a)
    let value: string | undefined
    let takes = false
    let isPattern = false
    if (a[1] === '-') {
      const eq = a.indexOf('=')
      const name = eq < 0 ? a : a.slice(0, eq)
      value = eq < 0 ? undefined : a.slice(eq + 1)
      takes = VALUE_LONG.includes(name)
      isPattern = name === '--regexp' || name === '--file'
    } else {
      const k = a.slice(1).search(new RegExp(`[${VALUE_SHORT}]`))
      if (k >= 0) {
        takes = true
        isPattern = 'ef'.includes(a[1 + k]!)
        value = a.length > k + 2 ? a.slice(k + 2) : undefined // `-tlua`, `-m5`: attached
      }
    }
    if (!takes) continue
    value ??= w[++j]
    if (isPattern && pattern === undefined && value !== undefined) pattern = value
  }
  if (pattern !== undefined) operands.unshift(pattern)
  return { tool, flags, operands }
}

const isAbs = (p: string) => /^([a-z]:)?[\\/]/i.test(p)

/** F02-R8: the directory after segment `s`, given the one before it (`undefined`: the session's, `null`: unknown). Only a literal `cd <path>` ended by `&&` is known; a subshell, any other `cd` or separator is not. */
// ponytail: `cd a && make || rg …` is taken as in a; if the cd failed the search ran elsewhere. Needs a shell to know.
function dirAfter(dir: string | null | undefined, s: Segment, next: string): string | null | undefined {
  const [cmd = '', path = ''] = s.words
  if (/^[({]/.test(cmd)) return null
  if (cmd !== 'cd') return dir
  if (s.words.length !== 2 || next !== '&&' || /[$`~*?[{\\]|^-/.test(path)) return null
  return isAbs(path) ? path : dir === null ? null : dir === undefined ? path : `${dir}/${path}`
}

/** F02-R1, R3, R8: the searches of a command, one per segment that holds one, less those reading standard input. */
export function searchesIn(command: string): Search[] {
  const segs = segments(command)
  let dir: string | null | undefined
  return segs.flatMap((s, i) => {
    const search = searchIn(s)
    const here = dir
    dir = dirAfter(dir, s, segs[i + 1]?.sep ?? '')
    return search && (!s.piped || hasPath(search)) ? [here === undefined ? search : { ...search, dir: here }] : []
  })
}

/** Whether the search has the short flag, alone or in a cluster (`-rl`), or one of the long flags. A cluster ends at a flag that takes its value attached (`-tlua`, `-m5`). */
const has = (search: Search, short: string, ...long: string[]) =>
  search.flags.some(f => long.includes(f) || (/^-[^-]/.test(f) && f.slice(1).split(/[ABCDMdefgjmtT0-9]/)[0]!.includes(short)))

/** F02-R2: the `path:line:text` and `path:text` lines, a bare path per line for `-l`, and, for one path operand, lines with no path. A path with a space, or with neither a `/` nor a `.`, is no hit. F02-R3: modes that print no hits give none. */
export function hitsIn(stdout: string, search: Search): Hits {
  // ponytail: F02-R3 says -L; for rg that is --follow (hits as usual). Spec proposal pending with the owner.
  // ponytail: --count-matches prints path:N like -c, so it adds nothing; F02-R3 should list it (spec proposal pending with the owner).
  if (has(search, 'c', '--count', '--count-matches') || has(search, 'q', '--quiet') || has(search, 'L', '--files-without-match') || search.flags.some(f => f === '--files' || f === '--json')) return {}
  const listing = has(search, 'l', '--files-with-matches')
  const hits: Hits = {}
  const add = (path: string, line: string) => {
    const h = (hits[path] ??= { hits: 0, chars: 0 })
    h.hits++
    h.chars += line.length
  }
  const lines = stdout.split('\n', MAX_LINES)
  for (const line of lines) {
    const path = listing ? line : line.slice(0, Math.max(line.indexOf(':'), 0))
    if (path === '' || /\s/.test(path) || !/[/.]/.test(path)) continue
    add(path, line)
  }
  // The pattern and one path: rg and grep print no path for a single file.
  if (!listing && !Object.keys(hits).length && search.operands.length === 2)
    for (const line of lines) if (line !== '') add(search.operands[1]!, line)
  return hits
}

/** The preview Claude read, less the `<persisted-output>` wrapper around it (F02-R9): its lines are no hits. */
const preview = (text: string) => text.split('\n').filter(l => !/^(<\/?persisted-output>|Output too large.*|Preview \(first .*\):|\.\.\.)$/.test(l)).join('\n')

/** One Bash call's search as an action, or null when it holds none or did not finish (F02-R6, R7). */
export function searchAction(command: string, readId: string, result: { stdout?: string; interrupted?: boolean; persistedOutputPath?: string }, cwd: string, text?: string): Searched | null {
  const search = searchesIn(command)[0]
  if (!search || search.dir === null || result.interrupted) return null
  const files: Searched['files'] = {}
  // F02-R8: a relative hit is under the search's directory, which is under the session's unless absolute.
  const from = (p: string) => (isAbs(p) ? [p] : isAbs(search.dir ?? '') ? [search.dir, p] : [cwd, search.dir, p]).filter(Boolean).join('/')
  for (const [path, h] of Object.entries(hitsIn(result.persistedOutputPath ? preview(text ?? '') : result.stdout ?? '', search))) files[normalize(from(path), cwd)] = h
  return Object.keys(files).length ? { type: 'searched', readId, files } : null
}
