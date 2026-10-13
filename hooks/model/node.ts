// Pure: the one way a reducer touches a node (F01-R9). Every file action goes through here.
import type { FileNode, Graph } from '../../types'

export const fresh = (path: string, turn: number): FileNode => ({
  path, state: 'ghost', change: null, reason: null, tokens: null, seen: '', hits: 0, added: 0, removed: 0,
  line: null, readId: null, agents: [], mainLoop: true, firstTurn: turn, lastTurn: turn, touched: 0,
})

// F15-R8: the fields that describe what the main conversation holds.
const owned = ({ state, tokens, seen, readId, hits }: FileNode) => ({ state, tokens, seen, readId, hits })

/**
 * Creates the node when missing, merges `patch(old)` over it, stamps `lastTurn` and `touched`, bumps `seq`.
 * F15-R1: a call from an agent adds its id to `agents` once, and a node it creates is subagent only; a call without one sets `mainLoop`.
 * F15-R8: once `mainLoop` is true an agent's call leaves `owned` alone; the main loop's first touch of a subagent-only node sets them as if the node were new.
 */
export function touch(g: Graph, path: string, turn: number, patch: (old: FileNode | undefined) => Partial<FileNode>, agentId?: string): Graph {
  const old = g.files[path]
  const seq = g.seq + 1
  const agents = old?.agents ?? []
  const who = { agents: agentId && !agents.includes(agentId) ? [...agents, agentId] : agents, mainLoop: agentId ? old?.mainLoop ?? false : true }
  // Whose view of `owned` wins over the patch: the main loop's kept one, a new node's, or the patch's own (none).
  const owner = agentId && old?.mainLoop ? old
    : !agentId && old && !old.mainLoop ? { ...fresh(path, turn), ...patch(undefined) }
    : null
  const node = { ...(old ?? fresh(path, turn)), ...patch(old), ...(owner && owned(owner)), ...who, path, lastTurn: turn, touched: seq }
  return { ...g, seq, files: { ...g.files, [path]: node } }
}

/** F15-R9: a change in a worktree says so, unless this tree already has a change of its own (`change` set, `reason` null). */
export const worktreeReason = (old: FileNode | undefined, worktree?: string): string | null =>
  worktree && !(old?.change && old.reason === null) ? `in worktree ${worktree}` : null
