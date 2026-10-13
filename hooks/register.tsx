import { read, update, type CoreEngineInterface, type Register, type StateDollar } from 'claude-code'
import { layout, reshaped } from './layout'
import { emptyGraph, reduce, type Action, type FileAction } from './model'
import { evict } from './model/evict'
import { loaded, refreshed, sized } from './model/memory'
import { withCapNote } from './model/notes'
import { editAction, notebookEditAction } from './parse/fileEdited'
import { reattachedAction } from './parse/attachment'
import { readAction } from './parse/fileRead'
import { writeAction } from './parse/fileWritten'
import { mentionAction } from './parse/mention'
import { listed, memoryNote, nestedSize } from './parse/memory'
import { normalize, worktreeOf } from './parse/path'
import { searchAction } from './parse/search'
import { MIN_ROWS, TOO_SHORT, graphRows, renderGraph } from './render/graph'
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
async function record($: Pick<CoreEngineInterface, 'state' | 'agent' | 'clock'>, action: FileAction, agentId?: string) {
  await apply($, agentId ? { ...action, agentId } : action)
  if (agentId) await nameAgent($, agentId)
}

// One action -> one update of `graph` (I9). The turn is read first; reducers stay pure.
async function apply($: StateDollar & Pick<CoreEngineInterface, 'clock'>, action: Action) {
  const turn = (await read($, TURN)) ?? 0
  let before = emptyGraph
  const graph = await update($, GRAPH, g => ((before = g ?? emptyGraph), evict(reduce(g, action, turn), maxNodes))) // I5: the cap is held in the same write
  if (reshaped(before, graph)) queueLayout($)
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
const parsers: Record<'Read' | 'Edit' | 'Write' | 'NotebookEdit' | 'Bash', (e: any, result: any, text?: string) => FileAction | null> = {
  Read: (e, r) => readAction(normalize(e.file_path, cwd), e.tool_use_id, r, cwd, importEdges),
  Edit: (e, r) => inWorktree(editAction(normalize(e.file_path, cwd), r, cwd, importEdges), e.file_path),
  Write: (e, r) => inWorktree(writeAction(normalize(e.file_path, cwd), r, cwd, importEdges), e.file_path),
  NotebookEdit: (e, r) => inWorktree(notebookEditAction(normalize(e.notebook_path, cwd), r), e.notebook_path),
  Bash: (e, r, text) => searchAction(e.command, e.tool_use_id, r, cwd, text), // F02: the hits of a search command
}

// F14-R3: the clamped `maxNodes` (I5). The engine already refuses a value outside 20 to 200 (F14-Q1); the clamp is for a build that does not.
let maxNodes = 60
// F06-R12, F14-R2: read once; off means no import is parsed.
let importEdges = true

export const register: Register = (on, options) => {
  maxNodes = Math.min(200, Math.max(20, Number(options.maxNodes ?? 60)))
  importEdges = options.importEdges !== false
  on('session.start', async ($, e, next) => {
    const out = await next(e)
    cwd = out.cwd
    await $.command.register({
      name: 'graph', description: 'Show what Claude read, searched and changed', argumentHint: '[list|graph]', immediate: true,
    })
    await refreshMemory($)
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
    return out
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /^(Read|Edit|Write|NotebookEdit|Bash)$/ }, async ($, e: any, next) => {
    const out = await next(e)
    if (!out.deny && !out.isError && out.result) {
      const action = parsers[e.tool as keyof typeof parsers](e, out.result, out.text)
      if (action) await record($, action, e.agentId)
    }
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
    const table = $.ui.resolve(e)
    const { Box, Button } = table
    const notes = (await read($, NOTES)) ?? []
    // F08-R10: the renderer follows the table (Raster on terminal: F09, Svg: F10, else the list), then `view`.
    const rows = graphRows(e.props.scroll.bodyRows, notes)
    const selected = (await read($, SELECTED)) ?? null
    const wantsGraph = e.surface === 'terminal' && 'Raster' in table && (await read($, VIEW)) === 'graph'
    return (
      <Box flexDirection="column">
        <Box gap={2}>
          <Button plain key="view-list" hotkey="l" onPress={() => setView($, 'list')}>List</Button>
          <Button plain key="view-graph" hotkey="g" onPress={() => setView($, 'graph')}>Graph</Button>
        </Box>
        {wantsGraph && rows >= MIN_ROWS
          ? renderGraph(table, await readGraph($), await readLayout($), await readMemory($), await readFill($), notes, e.props.bodyColumns, rows, selected)
          : renderList(table, await readGraph($), await readFill($), await readMemory($), wantsGraph ? [...notes, TOO_SHORT] : notes, e.props.bodyColumns, selected, path => update($, SELECTED, () => path))}
      </Box>
    )
  })
}
