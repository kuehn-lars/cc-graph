// Pure: the one way a reducer touches a node (F01-R9). Every file action goes through here.
import type { FileNode, Graph } from '../../types'

const fresh = (path: string, turn: number): FileNode => ({
  path, state: 'ghost', change: null, reason: null, tokens: null, seen: '', hits: 0, added: 0, removed: 0,
  line: null, readId: null, agents: [], mainLoop: true, firstTurn: turn, lastTurn: turn, touched: 0,
})

/** Creates the node when missing, merges `patch(old)` over it, stamps `lastTurn` and `touched`, bumps `seq`. */
export function touch(g: Graph, path: string, turn: number, patch: (old: FileNode | undefined) => Partial<FileNode>): Graph {
  const old = g.files[path]
  const seq = g.seq + 1
  return { ...g, seq, files: { ...g.files, [path]: { ...(old ?? fresh(path, turn)), ...patch(old), path, lastTurn: turn, touched: seq } } }
}
