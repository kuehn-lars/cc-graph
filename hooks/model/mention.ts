// Pure: an @-mentioned file lands in the graph (F01-R7).
import type { Graph, NodeState } from '../../types'
import { touch } from './node'

export type Mention = { type: 'mention'; path: string; state: Extract<NodeState, 'ghost' | 'partial' | 'read'>; seen: string }

export const mention = (g: Graph, a: Mention, turn: number): Graph =>
  touch(g, a.path, turn, () => ({ state: a.state, tokens: null, seen: a.seen }))
