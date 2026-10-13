// Pure: a Read lands in the graph (F01-R1, F01-R3).
import type { Graph, NodeState } from '../../types'
import { withImports, type ImportTarget } from './imports'
import { touch } from './node'

export type FileRead = { type: 'fileRead'; path: string; state: Extract<NodeState, 'read' | 'partial'>; tokens: number | null; seen: string; readId: string; imports?: ImportTarget[]; agentId?: string }

export type FileUnchanged = { type: 'fileUnchanged'; path: string; agentId?: string }

// F01-R3: Claude Code says the content is already there, so an existing node keeps its state (a compacted one stays compacted).
// F15-R1: it is touched only when that changes who holds it: a new agent id, or the main loop on a subagent-only node.
export const fileUnchanged = (g: Graph, a: FileUnchanged, turn: number): Graph => {
  const old = g.files[a.path]
  return old && (a.agentId ? old.agents.includes(a.agentId) : old.mainLoop)
    ? g
    : touch(g, a.path, turn, o => (o ? {} : { state: 'read', tokens: null, seen: 'unchanged since an earlier read' }), a.agentId)
}

export const fileRead = (g: Graph, a: FileRead, turn: number): Graph =>
  withImports(touch(g, a.path, turn, old =>
    // A partial read never downgrades a read node, and keeps its size.
    old?.state === 'read' && a.state === 'partial' ? {} : { state: a.state, tokens: a.tokens, seen: a.seen, readId: a.readId }, a.agentId), a.path, a.imports, turn)
