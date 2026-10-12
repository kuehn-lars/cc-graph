// Pure: a successful Write lands in the graph (F01-R6).
import type { Graph } from '../../types'
import { touch, worktreeReason } from './node'

export type FileWritten = { type: 'fileWritten'; path: string; created: boolean; tokens: number; added: number; removed: number; line: number; worktree?: string; agentId?: string }

export const fileWritten = (g: Graph, a: FileWritten, turn: number): Graph =>
  touch(g, a.path, turn, old => ({
    state: 'read', tokens: a.tokens, seen: 'written by Claude',
    reason: worktreeReason(old, a.worktree),
    change: a.created || old?.change === 'created' ? 'created' : 'edited',
    added: (old?.added ?? 0) + a.added, removed: (old?.removed ?? 0) + a.removed, line: a.line,
  }), a.agentId)
