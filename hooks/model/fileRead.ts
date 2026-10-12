// Pure: a Read lands in the graph (F01-R1, F01-R3).
import type { Graph, NodeState } from '../../types'
import { touch } from './node'

export type FileRead = { type: 'fileRead'; path: string; state: Extract<NodeState, 'read' | 'partial'>; tokens: number | null; seen: string; readId: string }

export type FileUnchanged = { type: 'fileUnchanged'; path: string }

// F01-R3: Claude Code says the content is already there, so an existing node stays as it is (a compacted one stays compacted).
export const fileUnchanged = (g: Graph, a: FileUnchanged, turn: number): Graph =>
  g.files[a.path] ? g : touch(g, a.path, turn, () => ({ state: 'read', tokens: null, seen: 'unchanged since an earlier read' }))

export const fileRead = (g: Graph, a: FileRead, turn: number): Graph =>
  touch(g, a.path, turn, old =>
    // A partial read never downgrades a read node, and keeps its size.
    old?.state === 'read' && a.state === 'partial' ? {} : { state: a.state, tokens: a.tokens, seen: a.seen, readId: a.readId })
