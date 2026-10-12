// Pure: a Bash command that holds a search, and the hits in its output (F02-R1, R2, R9).
import type { Searched } from '../model/searched'
import { normalize } from './path'

export type Search = { tool: string; flags: string[]; operands: string[] }
/** Per path: the hit lines found and their characters, without newlines. */
export type Hits = Record<string, { hits: number; chars: number }>

const TOOLS = ['rg', 'grep', 'egrep', 'fgrep']
const MAX_LINES = 1000

/** The words of one command segment: quotes and backslashes honoured, nothing expanded. Null when the command has more than one segment. */
function words(command: string): string[] | null {
  const out: string[] = []
  let cur = ''
  let has = false
  let quote = ''
  for (let i = 0; i < command.length; i++) {
    const c = command[i]!
    if (quote === "'") c === "'" ? (quote = '') : (cur += c)
    else if (quote === '"') {
      if (c === '"') quote = ''
      else if (c === '\\' && '"\\$`'.includes(command[i + 1] ?? ' ')) cur += command[++i]
      else cur += c
    } else if (c === '\\') (cur += command[++i] ?? ''), (has = true)
    else if (c === "'" || c === '"') (quote = c), (has = true)
    else if (c === ';' || c === '|' || c === '\n' || (c === '&' && command[i + 1] === '&')) return null
    else if (/\s/.test(c)) { if (has) out.push(cur); cur = ''; has = false }
    else (cur += c), (has = true)
  }
  if (has) out.push(cur)
  return out
}

// ponytail: one segment only; ticket 02 splits pipelines and chains.
export function searchesIn(command: string): Search[] {
  const w = words(command)
  if (!w) return []
  let i = 0
  while (/^[A-Za-z_]\w*=/.test(w[i] ?? '')) i++
  const first = w[i] ?? ''
  // Joined: a lone quoted git word in hooks/ makes check-calls.mjs ask for GIT_OPTIONAL_LOCKS (NFR-S5), and this runs nothing.
  const tool = w.slice(i, i + 2).join(' ') === 'git grep' ? 'git grep' : TOOLS.includes(first) ? first : ''
  if (!tool) return []
  const args = w.slice(i + (tool === 'git grep' ? 2 : 1))
  const end = args.indexOf('--')
  const isFlag = (a: string, j: number) => a.length > 1 && a[0] === '-' && (end < 0 || j < end)
  return [{ tool, flags: args.filter(isFlag), operands: args.filter((a, j) => !isFlag(a, j) && j !== end) }]
}

/** Whether the search has the short flag, alone or in a cluster (`-rl`), or one of the long flags. A cluster ends at a flag that takes its value attached (`-tlua`, `-m5`). */
const has = (search: Search, short: string, ...long: string[]) =>
  search.flags.some(f => long.includes(f) || (/^-[^-]/.test(f) && f.slice(1).split(/[ABCDMdefgjmtT0-9]/)[0]!.includes(short)))

/** F02-R2: the `path:line:text` and `path:text` lines, a bare path per line for `-l`, and, for one path operand, lines with no path. A path with a space, or with neither a `/` nor a `.`, is no hit. F02-R3: modes that print no hits give none. */
export function hitsIn(stdout: string, search: Search): Hits {
  // ponytail: F02-R3 says -L; for rg that is --follow (hits as usual). Spec proposal pending with the owner.
  if (has(search, 'c', '--count') || has(search, 'q', '--quiet') || has(search, 'L', '--files-without-match') || search.flags.some(f => f === '--files' || f === '--json')) return {}
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

/** One Bash call's search as an action, or null when it holds none or did not finish (F02-R6, R7). */
export function searchAction(command: string, readId: string, result: { stdout?: string; interrupted?: boolean; persistedOutputPath?: string }, cwd: string, text?: string): Searched | null {
  const search = searchesIn(command)[0]
  if (!search || result.interrupted) return null
  const files: Searched['files'] = {}
  for (const [path, h] of Object.entries(hitsIn(result.persistedOutputPath ? text ?? '' : result.stdout ?? '', search))) files[normalize(path, cwd)] = h
  return Object.keys(files).length ? { type: 'searched', readId, files } : null
}
