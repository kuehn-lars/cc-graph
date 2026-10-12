// Pure reducers: (graph, action, turn) -> graph. A later F01 ticket adds its action to `Action` and one `case`.
import type { Graph } from '../../types'
import { fileRead, type FileRead } from './fileRead'

import { mention, type Mention } from './mention'

export type Action = FileRead | Mention

export const emptyGraph: Graph = { seq: 0, files: {}, edges: [], decisions: [], compactions: [] }

export function reduce(g: Graph | undefined, a: Action, turn: number): Graph {
  const graph = g ?? emptyGraph
  switch (a.type) {
    case 'fileRead': return fileRead(graph, a, turn)
    case 'mention': return mention(graph, a, turn)
  }
}
