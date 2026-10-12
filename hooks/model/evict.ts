// Pure: I5. The cap on file nodes, held by evicting the least valuable nodes in the same write.
import type { Graph, NodeState } from '../../types'

// Cheapest to lose first. A state not listed (`unread`) is never evicted.
const order: NodeState[] = ['ghost', 'search', 'compacted', 'partial', 'read']

/** Drops nodes, state order then oldest `lastTurn`, until at most `max` remain. A node with a change, and one with an edge to or from one, stays; if nothing else can go the cap is exceeded. */
export function evict(g: Graph, max: number): Graph {
  const paths = Object.keys(g.files)
  if (paths.length <= max) return g
  const changed = new Set(paths.filter(p => g.files[p]!.change))
  const linked = new Set(g.edges.flatMap(e => (changed.has(e.from) || changed.has(e.to) ? [e.from, e.to] : [])))
  const rank = (p: string) => order.indexOf(g.files[p]!.state)
  const drop = paths
    .filter(p => !changed.has(p) && !linked.has(p) && rank(p) >= 0)
    .sort((a, b) => rank(a) - rank(b) || g.files[a]!.lastTurn - g.files[b]!.lastTurn || g.files[a]!.touched - g.files[b]!.touched)
    .slice(0, paths.length - max)
  const files = { ...g.files }
  for (const p of drop) delete files[p]
  const gone = new Set(drop)
  return { ...g, files, edges: g.edges.filter(e => !gone.has(e.from) && !gone.has(e.to)) } // I3: no edge outlives an endpoint
}
