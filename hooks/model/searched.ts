// Pure: a search call lands in the graph (F02-R4, R5). One call adds one copy of its hits, because the context holds each output.
import type { Graph } from '../../types'
import { plural } from '../parse/measure'
import { touch } from './node'

export type Searched = { type: 'searched'; readId: string; files: Record<string, { hits: number; chars: number }> }

export const searched = (g: Graph, a: Searched, turn: number): Graph =>
  Object.entries(a.files).reduce((g, [path, h]) => touch(g, path, turn, old => {
    // A real read keeps its state, tokens, seen and readId: the file's own size is what the meter counts.
    if (old?.state === 'read' || old?.state === 'partial') return { hits: old.hits + h.hits }
    const again = old?.state === 'search'
    const hits = (again ? old.hits : 0) + h.hits
    // A node back from `compacted` starts again, and says so.
    const sinceCompaction = old?.state === 'compacted' || (again && old.seen.endsWith('since compaction'))
    return {
      state: 'search', hits, readId: a.readId,
      tokens: (again ? old.tokens ?? 0 : 0) + Math.ceil(h.chars / 4),
      seen: `${plural(hits, 'search hit')}${sinceCompaction ? ' since compaction' : ', never opened'}`,
    }
  }), g)
