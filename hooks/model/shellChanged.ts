// Pure: what a shell command did to files, from git's status around it (F07-R6).
import type { FileNode, Graph } from '../../types'
import type { ShellChange } from '../parse/status'
import { cut } from '../parse/shell'
import { touch } from './node'

/** `agentId`: the subagent whose command it was (F15-R1). */
export type ShellChanged = { type: 'shellChanged'; command: string; changes: ShellChange[]; worktree?: string; agentId?: string }

/** F07-R17: a change the command named is Claude's own, as an Edit is (F01-R4): a node with nothing of the file in context becomes partial, or takes what Claude had of the file a `mv` moved here (`moved`); a search node keeps its tokens and readId. */
const own = (o: FileNode | undefined, moved?: FileNode): Partial<FileNode> =>
  (!o || o.state === 'ghost' || o.state === 'unread') && moved && moved.state !== 'ghost' && moved.state !== 'unread' ? { state: moved.state, tokens: moved.tokens, seen: moved.seen, readId: moved.readId }
    : !o || o.state === 'ghost' || o.state === 'unread' ? { state: 'partial', tokens: null, readId: null, seen: 'only what the command changed' }
    : o.state === 'search' ? { state: 'partial', seen: 'only what the command changed' }
      : {}

/** F07-R6: a reverted path loses its change, and the blind edges to it, since nothing changed is left to miss. A path with no node, or none to clear, is left alone. */
function reverted(g: Graph, path: string, turn: number, agentId?: string): Graph {
  if (!g.files[path]?.change) return g
  const out = touch(g, path, turn, () => ({ change: null, reason: null, added: 0, removed: 0 }), agentId)
  return out.edges.some(e => e.to === path && e.blind) ? { ...out, edges: out.edges.map(e => (e.to === path ? { ...e, blind: false } : e)) } : out
}

/**
 * F07-R6: each changed path touched once. A deletion always shows; a creation replaces no change but a deletion; any other change (`blind` or `edited`, F07-R17) leaves alone what Claude's own Write or Edit did.
 * A new node, or a ghost, becomes `unread`: Claude has not seen what the command wrote. One the command named is Claude's own (`own`).
 */
export const shellChanged = (g: Graph, a: ShellChanged, turn: number): Graph =>
  a.changes.reduce((g, { path, change, named, from, history, added, removed }) => {
    const old = g.files[path]?.change ?? null
    if (change === 'reverted' || (history && change === 'created' && old === 'deleted')) return reverted(g, path, turn, a.agentId) // F07-R14: brought back from history
    const keep = change === 'created' ? old !== null && old !== 'deleted' : change !== 'deleted' && (old === 'edited' || old === 'created')
    if (keep) return added !== undefined && old === 'created' ? touch(g, path, turn, () => ({ added }), a.agentId) : g // F07-R23: a created file's new length
    return touch(g, path, turn, o => ({
      ...(named ? own(o, from ? g.files[from] : undefined) : !o || o.state === 'ghost' ? { state: 'unread' as const, tokens: null, seen: 'never read' } : {}),
      change,
      ...(added !== undefined && (change === 'created' ? { added } : change === 'edited' && { added, removed })), // F07-R23
      reason: `${change === 'blind' || change === 'edited' ? 'changed' : change} by \`${cut(a.command)}\`${a.worktree ? ` in worktree ${a.worktree}` : ''}`, // F07-R16
    }), a.agentId)
  }, g)
