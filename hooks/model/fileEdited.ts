// Pure: a successful Edit or NotebookEdit lands in the graph (F01-R4, F01-R5).
import type { Graph } from '../../types'
import { touch } from './node'

export type FileEdited = { type: 'fileEdited'; path: string; added: number; removed: number; line: number | null; worktree?: string; agentId?: string }

export const fileEdited = (g: Graph, a: FileEdited, turn: number): Graph =>
  touch(g, a.path, turn, old => ({
    // The state is kept; a file with no node starts partial.
    ...(old ? {} : { state: 'partial' as const, seen: 'only the edited lines' }),
    reason: a.worktree ? `in worktree ${a.worktree}` : null, // F15-R9
    change: old?.change === 'created' ? 'created' : 'edited',
    added: (old?.added ?? 0) + a.added,
    removed: (old?.removed ?? 0) + a.removed,
    line: a.line ?? old?.line ?? null,
  }), a.agentId)
