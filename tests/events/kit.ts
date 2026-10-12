// Shared setup for event tests: the session runs in /w, tool calls answer with a recorded fixture.
import type { On } from 'claude-code'
import type { FileNode, Graph } from '../../types'

export type Fixture = { tool: string; tool_use_id: string; input: any; result: any }

/** The test's bottom hooks: cwd `/w`, turns echo their id, and each `tool.call` answers with `fixture.result`. */
export function engine(on: On, fixture: Fixture) {
  const answer = { ref: 0, result: fixture.result, text: '' }
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('tool.call', () => answer)
  for (const k of Object.keys(written)) delete written[k]
  on('state.set', (_$, e, next) => ((written[e.key] = e.value), next(e)))
  return answer
}

// The test `$` has no `state` noun: what the plugin wrote is read through a hook on `state.set`.
export const written: Record<string, any> = {}
export const graphOf = async (_$?: unknown): Promise<Graph | undefined> => written.graph
export const nodeOf = async ($: unknown, path: string): Promise<FileNode | undefined> => (await graphOf($))?.files[path]
export const start = ($: any) => $.session.start({ cwd: '/w', surface: null, isInteractive: false })
export const turn = ($: any, id = 't1') => $.turn.start({ text: '', turnId: id })
