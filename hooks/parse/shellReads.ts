// Pure: the files a Bash command prints, and what Claude saw of each (F07-R19).
import type { FileRead } from '../model/fileRead'
import { importCandidates } from './imports'
import { countLines, estimateTokens, plural } from './measure'
import { cut, dirAfter, resolve, segments, type Segment } from './shell'

const PRINTERS = ['cat', 'bat', 'nl', 'head', 'tail', 'sed']
const FILTERS = ['head', 'tail', 'sed'] // `sed -n` only: printOf refuses any other sed

/** Short flags that take a value (`head -n 5`, `bat -r 1:5`), so the value is no file. */
// ponytail: a fixed list, and long flags only when written `--flag=value` or one of VALUE_LONG; a value flag missing here leaves its value as an operand. Add when seen.
const VALUE_SHORT: Record<string, string> = { bat: 'rlHmdt', nl: 'bfhilnsvw', head: 'nc', tail: 'nc' }
const VALUE_LONG = ['--line-range', '--language', '--theme', '--highlight-line']

/** An operand the shell expands to other words: nothing here is a path (as `dirAfter` refuses a `cd` to one). */
const EXPANDED = /[$`~*?[{]/

type Printed = { cmd: string; files: string[]; flags: string[]; n?: string; script?: string; stdout: boolean }
/** `filter`: the `head`, `tail` or `sed -n` the print is piped into, which says what Claude saw of it. */
type Print = Printed & { dir: string | null | undefined; filter?: Printed }

/** The printing command of a segment, its file operands and flags; null for any other command. */
function printOf({ words: w, redirs }: Segment): Printed | null {
  let i = 0
  while (/^[A-Za-z_]\w*=/.test(w[i] ?? '')) i++
  const cmd = w[i] ?? ''
  if (!PRINTERS.includes(cmd) || (cmd === 'sed' && w[i + 1] !== '-n')) return null
  const out: Printed = { cmd, files: [], flags: [], stdout: true }
  let ended = false
  for (let j = i + (cmd === 'sed' ? 2 : 1); j < w.length; j++) {
    const a = w[j]!
    if (redirs.has(j)) {
      if (/^(1|&)?>/.test(a)) out.stdout = false
      if (/^(\d*|&)(>>?|<)$/.test(a)) j++ // `> file` has its file in the next word
      continue
    }
    if (!ended && a === '--') { ended = true; continue }
    if (cmd === 'sed' && out.script === undefined && (ended || a[0] !== '-' || a.length < 2)) { out.script = a; continue } // the script, whatever it holds, is no file
    if (ended || a.length < 2 || a[0] !== '-') { a !== '-' && a !== '&' && !EXPANDED.test(a) && out.files.push(a); continue } // `-` is standard input, a lone `&` backgrounds the command
    out.flags.push(a)
    if ((cmd === 'head' || cmd === 'tail') && /^-\d+$/.test(a)) { out.n = a.slice(1); continue } // `head -50`
    const k = a[1] === '-' ? -1 : [...a.slice(1)].findIndex(c => (VALUE_SHORT[cmd] ?? '').includes(c))
    const takes = k >= 0 ? a.length === k + 2 : VALUE_LONG.includes(a)
    if (k >= 0 && a[1 + k] === 'n') out.n = a.length > k + 2 ? a.slice(k + 2) : w[j + 1]
    if (takes) j++
  }
  return out
}

/** What a command's own form says Claude saw: `read` for the whole file, `partial` with the words F07-R19 gives. */
function form(p: Printed, command: string, known: number | null): Pick<FileRead, 'state' | 'seen'> {
  const through = { state: 'partial', seen: `through \`${cut(command)}\`` } as const
  const n = p.flags.length === 0 ? '10' : p.flags.length === 1 && /^\d+$/.test(p.n ?? '') ? p.n : null // `head` alone prints 10
  if (p.cmd === 'head') return n ? { state: 'partial', seen: `first ${n} lines` } : through
  if (p.cmd === 'tail') return n ? { state: 'partial', seen: `last ${n} lines` } : through
  if (p.cmd === 'sed') {
    const [, a, b] = /^(\d+)(?:,(\d+|\$))?p$/.exec(p.script ?? '') ?? []
    return !a ? through : { state: 'partial', seen: !b ? `line ${a}` : b === '$' ? `lines ${a} to the end` : `lines ${a} to ${b}` }
  }
  if (p.cmd === 'bat' && p.flags.some(f => f === '-r' || f.startsWith('--line-range'))) return through
  return known === null ? { state: 'read', seen: through.seen } : { state: 'read', seen: plural(known, 'line') }
}

/**
 * F07-R19: one read per file operand of each segment that prints its file. Lines and tokens are known only when the whole output belongs to one file: one operand in one segment, with no other segment that prints (a `cd` prints nothing).
 * `dir`: where each ran (F02-R8), from `start`, where the command starts when not the session's directory; a segment in an unknown folder reads nothing.
 */
export function shellReads(command: string, readId: string, result: { stdout?: string; interrupted?: boolean; persistedOutputPath?: string }, cwd: string, text: string | undefined, importEdges: boolean, start?: string): FileRead[] {
  if (result.interrupted) return []
  const segs = segments(command)
  let dir: string | null | undefined = start
  const prints: Print[] = []
  let others = 0
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]!
    const p = printOf(s)
    const next = segs[i + 1]
    // A print piped on is read only through `head`, `tail` or `sed -n` that names no file and is piped nowhere: Claude saw what came out of the pipe.
    const f = p && next?.sep === '|' ? printOf(next) : null
    const filter = f && FILTERS.includes(f.cmd) && !f.files.length && segs[i + 2]?.sep !== '|' ? f : undefined
    if (p && (next?.sep !== '|' || filter)) prints.push({ ...p, dir, filter })
    else if (s.words.length && s.words[0] !== 'cd') others++
    dir = dirAfter(dir, s, next?.sep ?? '')
    if (filter) dir = dirAfter(dir, next!, segs[(i += 1) + 1]?.sep ?? '') // the filter is part of this read
  }
  // ponytail: only isError and interrupted are checked, so `cat nofile 2>/dev/null || true` (exit 0) records a read that never happened. Needs the exit code or stderr to know.
  const files = prints.filter(p => p.stdout && p.dir !== null)
  const single = files.length === 1 && prints.length === 1 && files[0]!.files.length === 1 && others === 0
  return files.flatMap(p => p.files.map(file => {
    const path = resolve(file, p.dir as string | undefined, cwd)
    const seen = !p.filter ? form(p, command, single && !result.persistedOutputPath ? countLines(result.stdout) : null)
      : p.files.length > 1 ? { state: 'partial' as const, seen: `through \`${cut(command)}\`` } : form(p.filter, command, null)
    return {
      type: 'fileRead', path, readId, tokens: single ? estimateTokens(text ?? '') : null,
      ...seen, ...(result.persistedOutputPath && { state: 'partial', seen: 'preview only' }),
      imports: single && importEdges ? importCandidates(text ?? '', path, cwd) : undefined,
    } as FileRead
  }))
}
