// Pure: a text Read lands in the graph (F01-R1).
import type { Graph, NodeState } from '../../types'
import { touch } from './node'

export type FileRead = { type: 'fileRead'; path: string; state: Extract<NodeState, 'read' | 'partial'>; tokens: number | null; seen: string; readId: string }

export const fileRead = (g: Graph, a: FileRead, turn: number): Graph =>
  touch(g, a.path, turn, old =>
    // A partial read never downgrades a read node, and keeps its size.
    old?.state === 'read' && a.state === 'partial' ? {} : { state: a.state, tokens: a.tokens, seen: a.seen, readId: a.readId })
