// Pure: a Bash command that holds a search, and the hits in its output (F02-R1, R2, R9).
import type { Searched } from '../model/searched'
import { dirAfter, resolve, segments, type Segment } from './shell'

/** `dir`: where the search ran. Absent: the session's directory; a path: that of the `cd … &&` before it (F02-R8); `null`: unknown. */
export type Search = { tool: string; flags: string[]; operands: string[]; dir?: string | null }
/** Per path: the hit lines found and their characters, without newlines. */
export type Hits = Record<string, { hits: number; chars: number }>

const TOOLS = ['rg', 'grep', 'egrep', 'fgrep']
const MAX_LINES = 1000

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

/** F02-R1, R3, R8: the searches of a command, one per segment that holds one, less those reading standard input: piped into and naming no path (the pattern is the first operand, so a path is a second one). `start`: where the command starts, when not the session's directory. */
export function searchesIn(command: string, start?: string): Search[] {
  const segs = segments(command)
  let dir: string | null | undefined = start
  return segs.flatMap((s, i) => {
    const search = searchIn(s)
    const here = dir
    dir = dirAfter(dir, s, segs[i + 1]?.sep ?? '')
    return search && (s.sep !== '|' || search.operands.length > 1) ? [here === undefined ? search : { ...search, dir: here }] : []
  })
}

/** Whether the search has the short flag, alone or in a cluster (`-rl`), or one of the long flags. A cluster ends at a flag that takes its value attached (`-tlua`, `-m5`). */
const has = (search: Search, short: string, ...long: string[]) =>
  search.flags.some(f => long.includes(f) || (/^-[^-]/.test(f) && f.slice(1).split(new RegExp(`[${VALUE_SHORT}0-9]`))[0]!.includes(short)))

/** F02-R3: counts, quiet, file lists and JSON. -L lists files without a match for grep and git grep; for rg it is --follow and hits print as usual. */
const printsNoHits = (search: Search) =>
  has(search, 'c', '--count', '--count-matches') || has(search, 'q', '--quiet') || (search.tool !== 'rg' && has(search, 'L')) ||
  ['--files-without-match', '--files', '--json'].some(f => search.flags.includes(f))

/** F02-R2: the `path:line:text` and `path:text` lines, a bare path per line for `-l`, and, for one path operand, lines with no path. A path with a space or a quote, or with neither a `/` nor a `.`, or a line that is its path and a colon, is no hit. F02-R3: modes that print no hits give none. */
export function hitsIn(stdout: string, search: Search): Hits {
  if (printsNoHits(search)) return {}
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
    if (path === '' || /[\s"']/.test(path) || !/[/.]/.test(path) || line === `${path}:`) continue // `src/auth:` heads an ls listing
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
export function searchAction(command: string, readId: string, result: { stdout?: string; interrupted?: boolean; persistedOutputPath?: string }, cwd: string, text?: string, start?: string): Searched | null {
  const [search, ...more] = searchesIn(command, start)
  if (!search || more.length || search.dir === null || result.interrupted) return null // F02-R10: two searches' outputs run together
  const files: Searched['files'] = {}
  for (const [path, h] of Object.entries(hitsIn(result.persistedOutputPath ? preview(text ?? '') : result.stdout ?? '', search))) files[resolve(path, search.dir, cwd)] = h // F02-R8
  return Object.keys(files).length ? { type: 'searched', readId, files } : null
}
