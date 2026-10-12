// Shared setup for event tests: the session runs in /w, tool calls answer with a recorded fixture.
import type { On } from 'claude-code'
import reference from '../../fixtures/sessions/reference'
import type { FileNode, Graph } from '../../types'

export type Fixture = { tool: string; tool_use_id: string; input: any; result: any }

/** The test's bottom hooks: cwd `/w`, turns echo their id, and each `tool.call` answers with `fixture.result`. */
export function engine(on: On, fixture: Fixture) {
  const answer = { ref: 0, result: fixture.result, text: '' }
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('tool.call', (_$, e) => (toolIds.push(e.tool_use_id), answer))
  observe(on)
  return answer
}

/** Records every `state.set` (see `written`, `writes`) and forgets what an earlier test recorded. */
function observe(on: On) {
  for (const k of Object.keys(written)) delete written[k]
  writes.length = toolIds.length = 0
  on('state.set', (_$, e, next) => ((written[e.key] = e.value), writes.push(e.key), next(e)))
}

// The test `$` has no `state` noun: what the plugin wrote is read through a hook on `state.set`.
export const written: Record<string, any> = {}
/** The key of every `state.set`, in order, and the `tool_use_id` of every `tool.call` that reached the bottom. */
export const writes: string[] = []
export const toolIds: string[] = []
export const graphOf = async (): Promise<Graph | undefined> => written.graph
export const nodeOf = async (path: string): Promise<FileNode | undefined> => (await graphOf())?.files[path]
export const start = ($: any) => $.session.start({ cwd: '/w', surface: null, isInteractive: false })
export const turn = ($: any, id = 't1') => $.turn.start({ text: '', turnId: id })

/** Seeds the graph: a `state.get` hook beneath the mod answers the first read of `graph` with `graph` at version 0, then passes on. The answer is `{ value: StateRead }`, as the kit's own `next(e)` returns it. */
export function seedGraph(on: On, graph: Graph) {
  let seeded = false
  on('state.get', async (_$, e: any, next) => {
    if (e.key !== 'graph' || seeded) return next(e)
    seeded = true
    return { value: { value: graph, version: 0 } } as any
  })
}

/**
 * Replays steps 1 to `upToStep` of the reference session (first process): the session starts in the recorded cwd, the
 * turn starts, and each recorded `tool.call` is sent with its recorded input and answered, beneath the mod, with its
 * recorded result. The test registers its own `session.start` bottom hook (the engine's, or `ui(on)`).
 */
export async function replay($: any, on: On, upToStep: number) {
  const answer = { ref: 0, result: null as any, text: '' }
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('tool.call', () => answer)
  observe(on)
  await $.session.start({ ...(reference.events[0]!.input as any) })
  await turn($)
  for (const c of reference.events)
    if (c.event === 'tool.call' && c.process === 1 && c.step! <= upToStep) {
      Object.assign(answer, c.result)
      await $.tool.call(c.input)
    }
}
