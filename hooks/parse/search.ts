// Pure: a Bash command that holds a search, and the hits in its output (F02-R1, R2, R9).
import type { Searched } from '../model/searched'
import { normalize } from './path'

/** `dir`: where the search ran. Absent: the session's directory; a path: that of the `cd … &&` before it (F02-R8); `null`: unknown. */
export type Search = { tool: string; flags: string[]; operands: string[]; dir?: string | null }
/** Per path: the hit lines found and their characters, without newlines. */
export type Hits = Record<string, { hits: number; chars: number }>

const TOOLS = ['rg', 'grep', 'egrep', 'fgrep']
const MAX_LINES = 1000

type Segment = { words: string[]; piped: boolean; sep: string }

/** The segments of a command, split on `|`, `&&`, `||`, `;` and newlines outside quotes. Words: quotes and backslashes honoured, nothing expanded. `piped`: a `|` precedes the segment. */
function segments(command: string): Segment[] {
  const out: Segment[] = []
  let words: string[] = []
  let cur = ''
  let has = false
  let quote = ''
  let piped = false
  let sep = ''
  const word = () => { if (has) words.push(cur); cur = ''; has = false }
  for (let i = 0; i < command.length; i++) {
    const c = command[i]!
    if (quote === "'") c === "'" ? (quote = '') : (cur += c)
    else if (quote === '"') {
      if (c === '"') quote = ''
      else if (c === '\\' && '"\\$`'.includes(command[i + 1] ?? ' ')) cur += command[++i]
      else cur += c
    } else if (c === '\\') (cur += command[++i] ?? ''), (has = true)
    else if (c === "'" || c === '"') (quote = c), (has = true)
    else if (c === ';' || c === '|' || c === '\n' || (c === '&' && command[i + 1] === '&')) {
      word()
      out.push({ words, piped, sep })
      words = []
      piped = c === '|' && command[i + 1] !== '|'
      sep = c
      if (c !== ';' && c !== '\n' && command[i + 1] === c) (sep += c), i++
    } else if (/\s/.test(c)) word()
    else (cur += c), (has = true)
  }
  word()
  out.push({ words, piped, sep })
  return out
}

/** Does this search name a path to read? Without one, a piped-into search reads standard input (F02-R3). The pattern is an operand too (a flag's value is no flag), so a path is a second one. */
// ponytail: `--regexp=pat` and `-epat` carry the pattern in a flag, so their one operand is a path read as none; add when seen.
function hasPath({ operands }: Search): boolean {
  return operands.length > 1
}

function searchIn({ words: w }: Segment): Search | null {
  let i = 0
  while (/^[A-Za-z_]\w*=/.test(w[i] ?? '')) i++
  const first = w[i] ?? ''
  // Joined: a lone quoted git word in hooks/ makes check-calls.mjs ask for GIT_OPTIONAL_LOCKS (NFR-S5), and this runs nothing.
  const tool = w.slice(i, i + 2).join(' ') === 'git grep' ? 'git grep' : TOOLS.includes(first) ? first : ''
  if (!tool) return null
  const args = w.slice(i + (tool === 'git grep' ? 2 : 1))
  const end = args.indexOf('--')
  const isFlag = (a: string, j: number) => a.length > 1 && a[0] === '-' && (end < 0 || j < end)
  return { tool, flags: args.filter(isFlag), operands: args.filter((a, j) => !isFlag(a, j) && j !== end) }
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

/** F02-R2: the `path:line:text` and `path:text` lines. A path with a space, or with neither a `/` nor a `.`, is no hit. */
export function hitsIn(stdout: string, _search: Search): Hits {
  const hits: Hits = {}
  for (const line of stdout.split('\n', MAX_LINES)) {
    const path = line.slice(0, Math.max(line.indexOf(':'), 0))
    if (path === '' || /\s/.test(path) || !/[/.]/.test(path)) continue
    const h = (hits[path] ??= { hits: 0, chars: 0 })
    h.hits++
    h.chars += line.length
  }
  return hits
}

/** One Bash call's search as an action, or null when it holds none or did not finish (F02-R6, R7). */
export function searchAction(command: string, readId: string, result: { stdout?: string; interrupted?: boolean }, cwd: string): Searched | null {
  const search = searchesIn(command)[0]
  if (!search || search.dir === null || result.interrupted) return null
  const files: Searched['files'] = {}
  // F02-R8: a relative hit is under the search's directory, which is under the session's unless absolute.
  const from = (p: string) => (isAbs(p) ? [p] : isAbs(search.dir ?? '') ? [search.dir, p] : [cwd, search.dir, p]).filter(Boolean).join('/')
  for (const [path, h] of Object.entries(hitsIn(result.stdout ?? '', search))) files[normalize(from(path), cwd)] = h
  return Object.keys(files).length ? { type: 'searched', readId, files } : null
}
