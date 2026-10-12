// Pure: the one way a reducer touches a node (F01-R9). Every file action goes through here.
import type { FileNode, Graph } from '../../types'

const fresh = (path: string, turn: number): FileNode => ({
  path, state: 'ghost', change: null, reason: null, tokens: null, seen: '', hits: 0, added: 0, removed: 0,
  line: null, readId: null, agents: [], mainLoop: true, firstTurn: turn, lastTurn: turn, touched: 0,
})

// F15-R8: the fields that describe what the main conversation holds.
const owned = ['state', 'tokens', 'seen', 'readId', 'hits'] as const

const pick = (n: Partial<FileNode>) => Object.fromEntries(owned.filter(k => k in n).map(k => [k, n[k]]))
const omit = (n: Partial<FileNode>) => Object.fromEntries(Object.entries(n).filter(([k]) => !(owned as readonly string[]).includes(k)))

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
  const change = patch(old)
  const merged = agentId && old?.mainLoop ? omit(change)
    : !agentId && old && !old.mainLoop ? { ...omit(change), ...pick(fresh(path, turn)), ...pick(patch(undefined)) }
    : change
  return { ...g, seq, files: { ...g.files, [path]: { ...(old ?? fresh(path, turn)), ...merged, ...who, path, lastTurn: turn, touched: seq } } }
}
