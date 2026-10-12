// Pure: a Bash command that holds a search, and the hits in its output (F02-R1, R2, R9).
import type { Searched } from '../model/searched'
import { normalize } from './path'

export type Search = { tool: string; flags: string[]; operands: string[] }
/** Per path: the hit lines found and their characters, without newlines. */
export type Hits = Record<string, { hits: number; chars: number }>

const TOOLS = ['rg', 'grep', 'egrep', 'fgrep']
const MAX_LINES = 1000

type Segment = { words: string[]; piped: boolean }

/** The segments of a command, split on `|`, `&&`, `||`, `;` and newlines outside quotes. Words: quotes and backslashes honoured, nothing expanded. `piped`: a `|` precedes the segment. */
function segments(command: string): Segment[] {
  const out: Segment[] = []
  let words: string[] = []
  let cur = ''
  let has = false
  let quote = ''
  let piped = false
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
      out.push({ words, piped })
      words = []
      piped = c === '|' && command[i + 1] !== '|'
      if (c !== ';' && c !== '\n' && command[i + 1] === c) i++
    } else if (/\s/.test(c)) word()
    else (cur += c), (has = true)
  }
  word()
  out.push({ words, piped })
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

/** F02-R1, R3: the searches of a command, one per segment that holds one, less those reading standard input. */
export function searchesIn(command: string): Search[] {
  return segments(command).flatMap(s => {
    const search = searchIn(s)
    return search && (!s.piped || hasPath(search)) ? [search] : []
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
  if (!search || result.interrupted) return null
  const files: Searched['files'] = {}
  for (const [path, h] of Object.entries(hitsIn(result.stdout ?? '', search))) files[normalize(path, cwd)] = h
  return Object.keys(files).length ? { type: 'searched', readId, files } : null
}
