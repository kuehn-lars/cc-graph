import { read, update, type Register, type StateDollar } from 'claude-code'
import { reduce, type Action } from './model'
import { editAction, notebookEditAction } from './parse/fileEdited'
import { readAction } from './parse/fileRead'
import { writeAction } from './parse/fileWritten'
import { mentionAction } from './parse/mention'
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
}
