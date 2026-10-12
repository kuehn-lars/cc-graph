// Pure: an @-mentioned file lands in the graph (F01-R7).
import type { Graph, NodeState } from '../../types'
import { touch } from './node'

export type Mention = { type: 'mention'; path: string; state: Extract<NodeState, 'ghost' | 'partial' | 'read'>; seen: string }

const rank: Partial<Record<NodeState, number>> = { ghost: 0, partial: 1, read: 2 }

export const mention = (g: Graph, a: Mention, turn: number): Graph =>
  touch(g, a.path, turn, old =>
    // A mention only upgrades: it never downgrades a node, nor replaces what a Read recorded (size included).
    old && (rank[old.state] ?? -1) >= rank[a.state]! ? {} : { state: a.state, tokens: null, seen: a.seen })
