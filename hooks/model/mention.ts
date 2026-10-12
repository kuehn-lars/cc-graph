// Pure: an @-mentioned file lands in the graph (F01-R7).
import type { Graph, NodeState } from '../../types'
import { touch } from './node'

export type Mention = { type: 'mention'; path: string; state: Extract<NodeState, 'ghost' | 'partial' | 'read'>; seen: string }

// A mention changes a node only when it is missing or a ghost, and a PDF reference only when it is missing; else it is a touch.
export const mention = (g: Graph, a: Mention, turn: number): Graph =>
  touch(g, a.path, turn, old =>
    old && (old.state !== 'ghost' || a.state === 'ghost') ? {} : { state: a.state, tokens: null, seen: a.seen })
