import { read, update, type CoreEngineInterface, type Register, type StateDollar } from 'claude-code'
import { layout, reshaped } from './layout'
import { emptyGraph, reduce, type Action, type FileAction } from './model'
import { together } from './model/batch'
import { evict } from './model/evict'
import { loaded, refreshed, sized } from './model/memory'
import { withCapNote } from './model/notes'
import { editAction, notebookEditAction } from './parse/fileEdited'
import { externalAction, reattachedAction } from './parse/attachment'
import { PATHSPECS, importPattern, importersOf } from './parse/grep'
import { readAction } from './parse/fileRead'
import { writeAction } from './parse/fileWritten'
import { mentionAction } from './parse/mention'
import { listed, memoryNote, nestedSize } from './parse/memory'
import { normalize, worktreeOf } from './parse/path'
import { searchAction } from './parse/search'
import { shellReads } from './parse/shellReads'
import { moves, namedPaths, stashes } from './parse/shell'
import { nameStatusOf, shellChanges, statusOf } from './parse/status'
import { MIN_ROWS, TOO_SHORT, frame, graphColumns, graphRows, renderGraph } from './render/graph'
import { renderList } from './render/list'
import { summarize } from './render/summary'

const GRAPH = { plugin: 'cc-graph', key: 'graph' } as const
const PANE = 'cc-graph'
const TURN = { plugin: 'cc-graph', key: 'turn' } as const
const VIEW = { plugin: 'cc-graph', key: 'view' } as const
const FILL = { plugin: 'cc-graph', key: 'fill' } as const
const SELECTED = { plugin: 'cc-graph', key: 'selected' } as const
const AGENTS = { plugin: 'cc-graph', key: 'agents' } as const
const MEMORY = { plugin: 'cc-graph', key: 'memory' } as const
const NOTES = { plugin: 'cc-graph', key: 'notes' } as const
const LAYOUT = { plugin: 'cc-graph', key: 'layout' } as const

// F03-R7: every key but `view` back to its empty value; each later feature adds its key here (the scan wants literal refs, so no table).
const resetState = async ($: StateDollar) => {
  await update($, GRAPH, () => emptyGraph)
  await update($, TURN, () => 0)
  await update($, SELECTED, () => null)
  await update($, FILL, () => null)
  await update($, AGENTS, () => ({}))
  await update($, MEMORY, () => [])
  await update($, NOTES, () => [])
  await update($, LAYOUT, () => ({}))
  named.clear()
  searched.clear()
}

const setView = ($: StateDollar, view: 'list' | 'graph') => update($, VIEW, () => view)

// D5: slow work runs off the hook's return path. Hooks enqueue; one coalesced `$.clock.after` callback drains the queue, one job at a time, and a failing job is dropped. F07 adds its jobs here.
const QUEUE_DELAY_MS = 20
const jobs: (() => Promise<void>)[] = []
let draining = false // true from the first enqueue until the queue is empty: a job enqueued meanwhile joins the drain, so jobs never overlap
function enqueue($: Pick<CoreEngineInterface, 'clock'>, job: () => Promise<void>) {
  jobs.push(job)
  if (draining) return
  draining = true
  $.clock.after(QUEUE_DELAY_MS, async () => {
    for (let next = jobs.shift(); next; next = jobs.shift()) await next().catch(() => {})
    draining = false
  })
}

// F07-R9: a `git` job that fails or runs past its timeout is dropped; the reason goes to the debug log and the footer says so once.
const TIMED_OUT = 'Blind-spot search timed out'
const gitJob = ($: StateDollar & Pick<CoreEngineInterface, 'ui'>, job: () => Promise<void>) => async () => {
  await job().catch(async (err: unknown) => {
    $.ui.log(`git job dropped: ${err instanceof Error ? err.message : String(err)}`, { to: 'debug' })
    await update($, NOTES, ns => ((ns ?? []).includes(TIMED_OUT) ? ns ?? [] : [...(ns ?? []), TIMED_OUT]))
  })
}

// F09-R4: at most one layout pass waits in the queue; it reads the graph when it runs, so it lays out the latest. A graph that changed shape while the pass ran (a Read, or /clear) queues the next.
let layoutQueued = false
const queueLayout = ($: StateDollar & Pick<CoreEngineInterface, 'clock'>) => {
  if (layoutQueued) return
  layoutQueued = true
  enqueue($, async () => {
    layoutQueued = false
    const graph = await readGraph($)
    await update($, LAYOUT, previous => layout(previous ?? {}, graph))
    if (reshaped(graph, await readGraph($))) queueLayout($)
  })
}

// F09-R27: the size of the raster the last render drew (null: the list, or nothing), which a blit must carry. A render and each pulse take a new `pulses` number, so a render ends the pulse running, and a newer pulse keeps an older one from going on.
// ponytail: one pane, one raster: a render on another surface (no Raster) nulls `drawn`, which only cancels pulses; give each surface its own size if two panes ever show at once.
let drawn: { columns: number; rows: number } | null = null
let pulses = 0
const PULSE_MS = [0, 120, 120, 160] // the gaps before the white border, the shimmer, Claude's colour and the plain frame

// The pulse starts after the queue has placed the nodes; a denied blit is ignored. The redraw a layout write asks for lands after the job returns, not in it, so the pulse waits one more delay, or the redraw wipes it.
function queuePulse($: StateDollar & Pick<CoreEngineInterface, 'clock' | 'ui'>, paths: string[]) {
  enqueue($, async () => {
    $.clock.after(QUEUE_DELAY_MS, async () => {
      const size = drawn
      if (!size) return
      const mine = ++pulses
      const step = async (i: number): Promise<void> => {
        if (pulses !== mine) return
        await $.ui.blit({
          requestId: PANE, key: 'graph', ...size,
          cells: frame(await readGraph($), await readLayout($), size.columns, size.rows, (await read($, SELECTED)) ?? null, paths, i),
        }).catch(() => ({}))
        if (i < PULSE_MS.length - 1) $.clock.after(PULSE_MS[i + 1]!, () => step(i + 1))
      }
      await step(0)
    })
  })
}

const readGraph = async ($: StateDollar) => (await read($, GRAPH)) ?? emptyGraph
// F04-R1, R2: the memory files the summary breakdown lists (never 'full', which costs a request per file). No breakdown, or no answer, no change; a throw here would run the handlers beneath twice (the hook's .catch).
async function refreshMemory($: Pick<CoreEngineInterface, 'state' | 'session'>) {
  const files = (await $.session.usage({ breakdown: 'summary' }).catch(() => undefined))?.context.breakdown?.memoryFiles
  if (files) await update($, MEMORY, notes => refreshed(notes ?? [], listed(files, cwd)))
}

const readMemory = async ($: StateDollar) => (await read($, MEMORY)) ?? []
const readLayout = async ($: StateDollar) => (await read($, LAYOUT)) ?? {}
const readFill = async ($: StateDollar) => (await read($, FILL)) ?? null

// I4: the working directory is kept here; the state contract has no key for it. A reload refills it (session.start fires again).
let cwd = ''
// F15-R4: agent ids already asked for, marked before the list is awaited so parallel calls ask once. A reload asks again, and keeps a name already stored (the list forgets ended agents).
const named = new Set<string>()

// The name is written by its own update, outside the call that writes `graph` (I9). An id the list does not name is "agent".
async function nameAgent($: Pick<CoreEngineInterface, 'state' | 'agent'>, id: string) {
  if (named.has(id)) return
  named.add(id)
  const row = (await $.agent.list().catch(() => [])).find(a => a.id === id)
  await update($, AGENTS, as => ({ ...as, [id]: as?.[id] ?? { id, type: row?.type ?? 'agent', description: row?.description ?? id.slice(0, 8) } }))
}

// F15-R1: an action of a call that names an agent carries its id, and a touched node asks for the agent's name (R4).
async function record($: Pick<CoreEngineInterface, 'state' | 'agent' | 'clock' | 'ui'>, action: FileAction, agentId?: string) {
  await apply($, agentId ? { ...action, agentId } : action)
  if (agentId) await nameAgent($, agentId)
}

// One action -> one update of `graph` (I9). The turn is read first; reducers stay pure.
async function apply($: StateDollar & Pick<CoreEngineInterface, 'clock' | 'ui'>, action: Action) {
  const turn = (await read($, TURN)) ?? 0
  let before = emptyGraph
  const graph = await update($, GRAPH, g => ((before = g ?? emptyGraph), evict(reduce(g, action, turn), maxNodes))) // I5: the cap is held in the same write
  if (reshaped(before, graph)) queueLayout($)
  const touched = Object.values(graph.files).filter(n => n.touched > before.seq && n.state !== 'ghost').map(n => n.path)
  if (touched.length) queuePulse($, touched)
  // I5: what could not be evicted is said in the footer. A write of `notes` only when the note changes.
  const files = Object.keys(graph.files).length
  const notes = (await read($, NOTES)) ?? []
  if (withCapNote(notes, files, maxNodes) !== notes) await update($, NOTES, ns => withCapNote(ns ?? [], files, maxNodes))
}

// F15-R9: a change made in a worktree carries its name.
const inWorktree = <A extends FileAction | null>(a: A, path: string): A => {
  const worktree = worktreeOf(path, cwd)
  return a && worktree ? { ...a, worktree } : a
}

// The observed tools: each turns its call and result into one action (F01-R11: the path is the call's own input).
const parsers: Record<'Read' | 'Edit' | 'Write' | 'NotebookEdit' | 'Bash', (e: any, result: any, text?: string, start?: string) => FileAction | null> = {
  Read: (e, r) => readAction(normalize(e.file_path, cwd), e.tool_use_id, r, cwd, importEdges),
  Edit: (e, r) => inWorktree(editAction(normalize(e.file_path, cwd), r, cwd, importEdges), e.file_path),
  Write: (e, r) => inWorktree(writeAction(normalize(e.file_path, cwd), r, cwd, importEdges), e.file_path),
  NotebookEdit: (e, r) => inWorktree(notebookEditAction(normalize(e.notebook_path, cwd), r), e.notebook_path),
  Bash: (e, r, text, start) => together([searchAction(e.command, e.tool_use_id, r, cwd, text, start), ...shellReads(e.command, e.tool_use_id, r, cwd, text, importEdges, start)]), // F02: the hits of a search; F07-R19: the files it prints
}

// F07-R1, R5, R6: what shell commands do to files, from git's status around each Bash call, off the hook's path (R8). `root` is null outside a repository.
let root: string | null = null
type Snap = { status: Map<string, string>; head: string | null }
// F07-R16: one baseline per tree, by folder: the working tree (`cwd`) and each agent worktree.
const bases = new Map<string, Snap>()
const NO_GIT = 'Shell changes need git'
const GIT = { timeoutMs: 5000, env: { GIT_OPTIONAL_LOCKS: '0' } } // NFR-S5: never the index lock
// F07-R14: each status takes `HEAD` with it (none in a repository without commits).
async function status($: Pick<CoreEngineInterface, 'process'>, dir = cwd): Promise<Snap | null> {
  const r = await $.process.run(['git', 'status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: dir, ...GIT })
  if (r.exitCode !== 0) return null
  const h = await $.process.run(['git', 'rev-parse', 'HEAD'], { cwd: dir, ...GIT })
  return { status: statusOf(r.stdout), head: h.exitCode === 0 ? h.stdout.trim() : null }
}
async function headDiff($: Pick<CoreEngineInterface, 'process'>, dir: string, from: string, to: string) {
  const r = await $.process.run(['git', 'diff', '--name-status', '-z', '--no-renames', from, to], { cwd: dir, ...GIT })
  return r.exitCode === 0 ? nameStatusOf(r.stdout) : undefined
}
// Takes a tree's baseline anew (the working tree's, or a worktree's folder); a failing `git` keeps the old one.
async function rebase($: Pick<CoreEngineInterface, 'process'>, dir = cwd) {
  const now = await status($, dir)
  if (now) bases.set(dir, now)
}
async function findRoot($: StateDollar & Pick<CoreEngineInterface, 'process'>) {
  const r = await $.process.run(['git', 'rev-parse', '--show-toplevel'], { cwd, ...GIT }).catch(() => null)
  root = r?.exitCode === 0 ? r.stdout.trim() : null
  bases.clear()
  if (root) await rebase($)
  else await update($, NOTES, ns => (ns ?? []).includes(NO_GIT) ? ns ?? [] : [...(ns ?? []), NO_GIT])
}

// F07-R13: Claude's own change goes into the baseline, so a later command that removes the file is seen. One refresh waits at a time; it reads `git` when it runs, so it takes the latest.
// A file under a worktree refreshes that worktree's baseline (R16); a worktree `git` cannot run in is dropped by the queue. ponytail: a Set of folders waiting. A refresh that runs after a command's effects absorbs them (an Edit and a Bash call within one queue delay), so that command's change goes unseen; order refresh and command jobs if it matters.
const refreshQueued = new Set<string>()
function queueRefresh($: StateDollar & Pick<CoreEngineInterface, 'clock' | 'process' | 'ui'>, path: string) {
  const worktree = worktreeOf(path, cwd)
  const dir = worktree ? `${cwd}/.claude/worktrees/${worktree}` : cwd
  if (!root || refreshQueued.has(dir)) return
  refreshQueued.add(dir)
  enqueue($, gitJob($, async () => {
    refreshQueued.delete(dir)
    await rebase($, dir)
  }))
}

// F07-R2, R3, R4: the files that import a path Claude changed and were never opened, found by `git grep` and confirmed with F06's rules. `grep` exits 1 when nothing matches.
const searched = new Set<string>() // paths searched this main-loop turn, cleared at `turn.start`
function queueImporters($: StateDollar & Pick<CoreEngineInterface, 'process' | 'clock' | 'ui'>, path: string) {
  if (!root || searched.has(path)) return
  searched.add(path)
  enqueue($, gitJob($, async () => {
    const r = await $.process.run(['git', 'grep', '-n', '-I', '--untracked', '-E', '-e', importPattern(path), '--', ...PATHSPECS], { cwd: root!, ...GIT })
    const importers = r.exitCode === 0 ? importersOf(r.stdout, path, root!, cwd) : []
    if (importers.length) await apply($, { type: 'importers', path, importers })
  }))
}

// F07-R6, R14, R16: what one `Bash` call did. An agent's call looks in its worktree first, and in the working tree if `git` cannot run there.
async function shellJob($: StateDollar & Pick<CoreEngineInterface, 'process' | 'clock' | 'ui' | 'agent'>, e: { command: string; agentId?: string }, start?: string) {
  const wt = e.agentId ? `${cwd}/.claude/worktrees/agent-${e.agentId}` : null
  const inWt = wt ? await status($, wt).catch(() => null) : null
  const dir = inWt ? wt! : cwd
  const now = inWt ?? (await status($))
  const before = bases.get(dir) ?? (inWt ? { status: new Map<string, string>(), head: null } : undefined) // a new worktree is clean
  if (!now || !before) return
  const diff = !now.head || before.head === now.head ? undefined : before.head ? await headDiff($, dir, before.head, now.head) : 'first' // F07-R14
  const reverts = before.head === now.head && !stashes(e.command) // F07-R6: `git stash pop` brings a stashed change back
  const moved = moves(e.command, cwd, start) // F07-R17: a mv's new path takes what Claude had of the old one
  const changes = shellChanges(before.status, now.status, root!, cwd, diff, namedPaths(e.command, cwd, start), reverts).map(c => (c.change === 'created' && moved.has(c.path) ? { ...c, from: moved.get(c.path) } : c))
  bases.set(dir, now)
  if (changes.length) await apply($, { type: 'shellChanged', command: e.command, changes, ...(inWt ? { worktree: `agent-${e.agentId}` } : {}), ...(e.agentId ? { agentId: e.agentId } : {}) }) // F15-R1
  if (changes.length && e.agentId) await nameAgent($, e.agentId)
  for (const c of changes) if (c.named) queueImporters($, c.path) // F07-R2: a change the command named is Claude's own
}

// F14-R3: the clamped `maxNodes` (I5). The engine already refuses a value outside 20 to 200 (F14-Q1); the clamp is for a build that does not.
let maxNodes = 60
// F06-R12, F14-R2: read once; off means no import is parsed.
let importEdges = true
// F07-R12, F14-R2: read once; off, `root` stays null, so no git job is ever queued, and the list has no Blind spots section. Shell reads need no git.
let blindSpots = true

export const register: Register = (on, options) => {
  maxNodes = Math.min(200, Math.max(20, Number(options.maxNodes ?? 60)))
  importEdges = options.importEdges !== false
  blindSpots = options.blindSpots !== false
  on('session.start', async ($, e, next) => {
    const out = await next(e)
    cwd = out.cwd
    await $.command.register({
      name: 'graph', description: 'Show what Claude read, searched and changed', argumentHint: '[list|graph]', immediate: true,
    })
    await refreshMemory($)
    if (blindSpots) enqueue($, () => findRoot($))
    return out
  }).catch(($, e, next) => next(e))

  on('classic.SessionStart', async ($, e, next) => {
    const out = await next(e)
    if (e.source === 'clear' || e.source === 'resume' || e.source === 'fork') await resetState($)
    return out
  }).catch(($, e, next) => next(e))

  on('turn.start', async ($, e, next) => {
    const out = await next(e)
    await update($, TURN, n => (n ?? 0) + 1)
    searched.clear()
    if (root) enqueue($, gitJob($, () => rebase($))) // F07-R5: what the person changed between turns is not the next command's doing
    return out
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /^(Read|Edit|Write|NotebookEdit|Bash)$/ }, async ($, e: any, next) => {
    // F02-R8: where a command starts, read before it runs: the Bash tool keeps a `cd` from one call for the next.
    const start = e.tool === 'Bash' ? await $.session.cwd().then(d => (d === cwd ? undefined : d), () => undefined) : undefined
    const out = await next(e)
    if (!out.deny && !out.isError && out.result) {
      const action = parsers[e.tool as keyof typeof parsers](e, out.result, out.text, start)
      if (action) await record($, action, e.agentId)
    }
    if (!out.deny && !out.isError && /^(Edit|Write|NotebookEdit)$/.test(e.tool)) queueRefresh($, e.file_path ?? e.notebook_path)
    if (!out.deny && !out.isError && /^(Edit|Write)$/.test(e.tool)) queueImporters($, normalize(e.file_path, cwd)) // F07-R2
    // F07-R6: a command that ran, even one that failed, may have created, deleted or changed files.
    // F07-R18: a call the engine held read-only changed no file.
    if (e.tool === 'Bash' && !out.deny && !out.isReadOnly && root) enqueue($, gitJob($, () => shellJob($, e, start)))
    return out
  }).catch(($, e, next) => next(e))

  on('prompt.mention', async ($, e, next) => {
    const out = await next(e)
    if (!out.deny) {
      const action = mentionAction(normalize(e.path, cwd), e, out.type ?? null)
      if (action) await record($, action, e.agentId)
    }
    return out
  }).catch(($, e, next) => next(e))

  // F03-R4: the window's real fill, stored as reported.
  on('session.measure', async ($, e, next) => {
    const out = await next(e)
    if (e.changed.includes('context')) {
      await update($, FILL, () => ({ tokens: e.context.tokens ?? null, window: e.context.window, percent: e.context.percent ?? null }))
      await refreshMemory($)
    }
    return out
  }).catch(($, e, next) => next(e))

  // F03-R1, R8: a compaction that stands, of the main loop. A subagent's (agentId), a skip and a precompute change nothing.
  on('session.compact', async ($, e, next) => {
    const out = await next(e)
    if (out.messages && !e.agentId && e.trigger !== 'precompute') {
      const keptIds = out.messages.flatMap(m => m.toolUses.map(t => t.tool_use_id))
      await apply($, { type: 'compacted', keptIds, trigger: e.trigger, tokensBefore: out.tokensBefore ?? null, tokensAfter: out.tokensAfter ?? null })
    }
    return out
  }).catch(($, e, next) => next(e))

  // F03-R3: a file Claude Code re-attached after a compaction. The reducer skips every node but a compacted one.
  on('prompt.attachment', { type: 'file' }, async ($, e, next) => {
    const out = await next(e)
    const action = e.agentId ? null : reattachedAction(e.text, cwd)
    if (action) await apply($, action)
    return out
  }).catch(($, e, next) => next(e))

  // F07-R7: a main-loop file changed outside Claude that Claude Code showed it. Not a blind spot. Needs no git.
  on('prompt.attachment', { type: 'edited_text_file' }, async ($, e, next) => {
    const out = await next(e)
    if (!e.agentId) await apply($, externalAction(e.text, cwd))
    return out
  }).catch(($, e, next) => next(e))

  // F04-R3: a memory file Claude Code loads, noted at once. Its size waits for the usage breakdown (ticket 03).
  on('classic.InstructionsLoaded', async ($, e, next) => {
    const out = await next(e)
    await update($, MEMORY, notes => loaded(notes ?? [], memoryNote(e, cwd)))
    return out
  }).catch(($, e, next) => next(e))

  // F04-R6: the size of a nested file, from the text Claude Code put in the window. A subagent's attachment (agentId) is not the main loop's.
  on('prompt.attachment', { type: 'nested_memory' }, async ($, e, next) => {
    const out = await next(e)
    const size = e.agentId ? null : nestedSize(e.text, cwd)
    if (size) await update($, MEMORY, notes => sized(notes ?? [], size.path, size.tokens))
    return out
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'graph' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg === 'list' || arg === 'graph') await setView($, arg) // F08-R2: also where nothing draws
    // F08-R4 / NFR-C3: where nothing draws, answer in text and open nothing.
    if ((await $.session.surfaces()).length === 0) return { text: summarize(await readGraph($), await readFill($)) }
    const opened = await $.ui.open({ id: PANE, title: 'CC Graph', focus: true, closeOnEscape: true, columns: 64 })
    if (!opened.isPlaced) $.ui.toast(`CC Graph is waiting for room: ${opened.reason}`)
    return { text: 'CC Graph opened.' }
  }).catch(($, e, next) => next(e))

  // NFR-R4: only this plugin's pane. Reads state, never writes.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    pulses++
    const table = $.ui.resolve(e)
    const { Box, Button, Text } = table
    const notes = (await read($, NOTES)) ?? []
    // F08-R10: the renderer follows the table (Raster on terminal: F09, Svg: F10, else the list), then `view`.
    const rows = graphRows(e.props.scroll.bodyRows, notes)
    const selected = (await read($, SELECTED)) ?? null
    const wantsGraph = e.surface === 'terminal' && 'Raster' in table && (await read($, VIEW)) === 'graph'
    const graphShown = wantsGraph && rows >= MIN_ROWS
    drawn = graphShown ? { columns: graphColumns(e.props.bodyColumns), rows } : null
    return (
      <Box flexDirection="column">
        <Box gap={2}>
          {graphShown && <Text bold><Text color="claude">✻</Text> CC Graph</Text>}
          {graphShown && <Text dimColor>what Claude knows</Text>}
          <Button plain key="view-list" hotkey="l" onPress={() => setView($, 'list')}>List</Button>
          <Button plain key="view-graph" hotkey="g" onPress={() => setView($, 'graph')}>Graph</Button>
        </Box>
        {graphShown
          ? renderGraph(table, await readGraph($), await readLayout($), await readMemory($), await readFill($), notes, e.props.bodyColumns, rows, selected)
          : renderList(table, await readGraph($), await readFill($), await readMemory($), wantsGraph ? [...notes, TOO_SHORT] : notes, e.props.bodyColumns, selected, path => update($, SELECTED, () => path), blindSpots)}
      </Box>
    )
  })
}
