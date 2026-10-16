// Pure: the actions of one call land in the graph together (I9: one call, one write).
import type { Graph } from '../../types'
import type { Action, FileAction } from '.'

export type Batch = { type: 'batch'; actions: FileAction[]; agentId?: string }

/** The call's own actions in order, each as if the agent that made the call (F15-R1) had made it. `reduce` is passed in: the index imports this module. */
export const batch = (g: Graph, a: Batch, turn: number, reduce: (g: Graph, a: Action, turn: number) => Graph): Graph =>
  a.actions.reduce((g, x) => reduce(g, a.agentId ? { ...x, agentId: a.agentId } : x, turn), g)

/** One action, as it is, for a call that made one; a batch for several; null for none. */
export const together = (actions: (FileAction | null)[]): FileAction | null => {
  const some = actions.filter((a): a is FileAction => a !== null)
  return some.length > 1 ? { type: 'batch', actions: some } : some[0] ?? null
}
