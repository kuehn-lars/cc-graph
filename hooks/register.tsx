import { read, update, type Register, type StateDollar } from 'claude-code'
import { emptyGraph, reduce, type Action } from './model'
import { editAction, notebookEditAction } from './parse/fileEdited'
import { reattachedAction } from './parse/attachment'
import { readAction } from './parse/fileRead'
import { writeAction } from './parse/fileWritten'
import { mentionAction } from './parse/mention'
import { normalize } from './parse/path'
import { searchAction } from './parse/search'
import { renderList } from './render/list'
import { summarize } from './render/summary'

const GRAPH = { plugin: 'cc-graph', key: 'graph' } as const
const PANE = 'cc-graph'
const TURN = { plugin: 'cc-graph', key: 'turn' } as const
const VIEW = { plugin: 'cc-graph', key: 'view' } as const
const FILL = { plugin: 'cc-graph', key: 'fill' } as const
const SELECTED = { plugin: 'cc-graph', key: 'selected' } as const
const AGENTS = { plugin: 'cc-graph', key: 'agents' } as const

// F03-R7: every key but `view` back to its empty value; each later feature adds its key here (the scan wants literal refs, so no table).
const resetState = async ($: StateDollar) => {
  await update($, GRAPH, () => emptyGraph)
  await update($, TURN, () => 0)
  await update($, SELECTED, () => null)
  await update($, FILL, () => null)
  await update($, AGENTS, () => ({}))
  named.clear()
}

const setView = ($: StateDollar, view: 'list' | 'graph') => update($, VIEW, () => view)

const readGraph = async ($: StateDollar) => (await read($, GRAPH)) ?? emptyGraph
const readFill = async ($: StateDollar) => (await read($, FILL)) ?? null

// I4: the working directory is kept here; the state contract has no key for it. A reload refills it (session.start fires again).
let cwd = ''
// F15-R4: agent ids already asked for, marked before the list is awaited so parallel calls ask once. A reload asks again, and keeps a name already stored (the list forgets ended agents).
const named = new Set<string>()

// The name is written by its own update, outside the call that writes `graph` (I9). An id the list does not name is "agent".
async function nameAgent($: any, id: string) {
  if (named.has(id)) return
  named.add(id)
  const row = (await $.agent.list().catch(() => [])).find((a: any) => a.id === id)
  await update($, AGENTS, as => ({ ...as, [id]: as?.[id] ?? { id, type: row?.type ?? 'agent', description: row?.description ?? id.slice(0, 8) } }))
}

// One action -> one update of `graph` (I9). The turn is read first; reducers stay pure.
async function apply($: StateDollar, action: Action) {
  const turn = (await read($, TURN)) ?? 0
  await update($, GRAPH, g => reduce(g, action, turn))
}

// The observed tools: each turns its call and result into one action (F01-R11: the path is the call's own input).
const parsers: Record<'Read' | 'Edit' | 'Write' | 'NotebookEdit' | 'Bash', (e: any, result: any, text?: string) => Action | null> = {
  Read: (e, r) => readAction(normalize(e.file_path, cwd), e.tool_use_id, r),
  Edit: (e, r) => editAction(normalize(e.file_path, cwd), r),
  Write: (e, r) => writeAction(normalize(e.file_path, cwd), r),
  NotebookEdit: (e, r) => notebookEditAction(normalize(e.notebook_path, cwd), r),
  Bash: (e, r, text) => searchAction(e.command, e.tool_use_id, r, cwd, text), // F02: the hits of a search command
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const out = await next(e)
    cwd = out.cwd
    await $.command.register({
      name: 'graph', description: 'Show what Claude read, searched and changed', argumentHint: '[list|graph]', immediate: true,
    })
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
      if (action) {
        await apply($, e.agentId ? { ...action, agentId: e.agentId } as Action : action)
        if (e.agentId) await nameAgent($, e.agentId) // F15-R4: a node was touched
      }
    }
    return out
  }).catch(($, e, next) => next(e))

  on('prompt.mention', async ($, e, next) => {
    const out = await next(e)
    if (!out.deny) {
      const action = mentionAction(normalize(e.path, cwd), e, out.type ?? null)
      if (action) await apply($, action)
    }
    return out
  }).catch(($, e, next) => next(e))

  // F03-R4: the window's real fill, stored as reported.
  on('session.measure', async ($, e, next) => {
    const out = await next(e)
    if (e.changed.includes('context')) await update($, FILL, () => ({ tokens: e.context.tokens ?? null, window: e.context.window, percent: e.context.percent ?? null }))
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
    // F08-R10: the renderer follows the table (Raster: F09, Svg: F10, else the list). Neither graph has shipped, so `view` changes nothing drawn yet.
    return (
      <Box flexDirection="column">
        <Box gap={2}>
          <Button plain key="view-list" hotkey="l" onPress={() => setView($, 'list')}>List</Button>
          <Button plain key="view-graph" hotkey="g" onPress={() => setView($, 'graph')}>Graph</Button>
        </Box>
        {renderList(table, await readGraph($), await readFill($), e.props.bodyColumns, (await read($, SELECTED)) ?? null, path => update($, SELECTED, () => path))}
      </Box>
    )
  })
}
