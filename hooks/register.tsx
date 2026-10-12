import { read, update, type Register, type StateDollar } from 'claude-code'
import { emptyGraph, reduce, type Action } from './model'
import { editAction, notebookEditAction } from './parse/fileEdited'
import { readAction } from './parse/fileRead'
import { writeAction } from './parse/fileWritten'
import { mentionAction } from './parse/mention'
import { normalize } from './parse/path'
import { renderList } from './render/list'
import { summarize } from './render/summary'

const GRAPH = { plugin: 'cc-graph', key: 'graph' } as const
const PANE = 'cc-graph'
const TURN = { plugin: 'cc-graph', key: 'turn' } as const
const VIEW = { plugin: 'cc-graph', key: 'view' } as const
const SELECTED = { plugin: 'cc-graph', key: 'selected' } as const

const setView = ($: StateDollar, view: 'list' | 'graph') => update($, VIEW, () => view)

const readGraph = async ($: StateDollar) => (await read($, GRAPH)) ?? emptyGraph

// I4: the working directory is kept here; the state contract has no key for it. A reload refills it (session.start fires again).
let cwd = ''

// One action -> one update of `graph` (I9). The turn is read first; reducers stay pure.
async function apply($: StateDollar, action: Action) {
  const turn = (await read($, TURN)) ?? 0
  await update($, GRAPH, g => reduce(g, action, turn))
}

// The observed tools: each turns its call and result into one action (F01-R11: the path is the call's own input).
const parsers: Record<'Read' | 'Edit' | 'Write' | 'NotebookEdit', (e: any, result: any) => Action | null> = {
  Read: (e, r) => readAction(normalize(e.file_path, cwd), e.tool_use_id, r),
  Edit: (e, r) => editAction(normalize(e.file_path, cwd), r),
  Write: (e, r) => writeAction(normalize(e.file_path, cwd), r),
  NotebookEdit: (e, r) => notebookEditAction(normalize(e.notebook_path, cwd), r),
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

  on('turn.start', async ($, e, next) => {
    const out = await next(e)
    await update($, TURN, n => (n ?? 0) + 1)
    return out
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /^(Read|Edit|Write|NotebookEdit)$/ }, async ($, e: any, next) => {
    const out = await next(e)
    if (!out.deny && !out.isError && out.result) {
      const action = parsers[e.tool as keyof typeof parsers](e, out.result)
      if (action) await apply($, action)
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

  on('command.run', { command: 'graph' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg === 'list' || arg === 'graph') await setView($, arg) // F08-R2: also where nothing draws
    // F08-R4 / NFR-C3: where nothing draws, answer in text and open nothing.
    if ((await $.session.surfaces()).length === 0) return { text: summarize(await readGraph($)) }
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
        {renderList(table, await readGraph($), e.props.bodyColumns, (await read($, SELECTED)) ?? null, path => update($, SELECTED, () => path))}
      </Box>
    )
  })
}
