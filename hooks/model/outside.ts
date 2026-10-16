// Pure: files changed outside Claude between turns (F07-R20). Never a blind spot.
import type { Graph } from '../../types'
import { touch } from './node'

export type Outside = { type: 'outside'; changes: { path: string; change: 'deleted' | 'external' }[] }

/** A deletion always shows. Any other change marks a node with no change, or a new one (`unread`), `external`; a node with a change keeps it, and its reason. */
export const outside = (g: Graph, a: Outside, turn: number): Graph =>
  a.changes.reduce((g, { path, change }) => {
    const old = g.files[path]
    if (change === 'external' && old?.change) return g
    return touch(g, path, turn, o => ({
      ...(!o ? { state: 'unread' as const, tokens: null, seen: 'never read' } : {}),
      change, reason: `${change === 'deleted' ? 'deleted' : 'changed'} outside Claude`,
    }))
  }, g)
