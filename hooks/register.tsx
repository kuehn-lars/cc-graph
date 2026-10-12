import { read, update, type Register, type StateDollar } from 'claude-code'
import { reduce, type Action } from './model'
import { editAction, notebookEditAction } from './parse/fileEdited'
import { readAction } from './parse/fileRead'
import { normalize } from './parse/path'

const GRAPH = { plugin: 'cc-graph', key: 'graph' } as const
const TURN = { plugin: 'cc-graph', key: 'turn' } as const

// I4: the working directory is kept here; the state contract has no key for it. A reload refills it (session.start fires again).
let cwd = ''

// One action -> one update of `graph` (I9). The turn is read first; reducers stay pure.
async function apply($: StateDollar, action: Action) {
  const turn = (await read($, TURN)) ?? 0
  await update($, GRAPH, g => reduce(g, action, turn))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const out = await next(e)
    cwd = out.cwd
    return out
  }).catch(($, e, next) => next(e))

  on('turn.start', async ($, e, next) => {
    const out = await next(e)
    await update($, TURN, n => (n ?? 0) + 1)
    return out
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    const out = await next(e)
    if (!out.deny && !out.isError && out.result) {
      const action = readAction(normalize(e.file_path, cwd), e.tool_use_id, out.result)
      if (action) await apply($, action)
    }
    return out
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const out = await next(e)
    if (!out.deny && !out.isError && out.result) {
      const action = editAction(normalize(e.file_path, cwd), out.result)
      if (action) await apply($, action)
    }
    return out
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'NotebookEdit' }, async ($, e, next) => {
    const out = await next(e)
    if (!out.deny && !out.isError && out.result) {
      const action = notebookEditAction(normalize(e.notebook_path, cwd), out.result)
      if (action) await apply($, action)
    }
    return out
  }).catch(($, e, next) => next(e))
}
