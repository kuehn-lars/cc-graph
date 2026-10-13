// Pure: the two legend lines under the graph (F09-R20).
import type { Change, Graph, MemoryNote, NodeState } from '../../types'
import { COLOR, RING } from './cells'
import type { Seg } from './width'

// R15's order, and what each shape says.
const SHAPES: [NodeState, string, string][] = [
  ['read', '●', 'in context'], ['partial', '◐', 'partly read'], ['search', '◌', 'search hits only'],
  ['compacted', '○', 'compacted'], ['unread', '!', 'unread'], ['ghost', '✕', 'never opened'],
]
const WORD: Record<Change, string> = { edited: 'edited', created: 'created', external: 'changed', blind: 'changed unseen' }
const join = (groups: Seg[][], sep: Seg): Seg[] => groups.flatMap((g, i) => (i ? [sep, ...g] : g))
const dim = (text: string): Seg => ({ text, dim: true })

/** `● in context  ◐ partly read`, then `rings  edited · created  memory  CLAUDE.md`: what is on screen, and no other; a line with nothing to name is empty. */
export function legendLines(graph: Graph, memory: MemoryNote[]): [Seg[], Seg[]] {
  const files = Object.values(graph.files)
  const rings = (Object.keys(RING) as Change[]).filter(c => files.some(n => n.change === c))
  return [
    join(SHAPES.filter(([s]) => files.some(n => n.state === s)).map(([s, mark, w]) => [{ text: mark, color: COLOR[s] }, dim(` ${w}`)]), dim('  ')),
    join([
      ...(rings.length ? [[dim('rings  '), ...join(rings.map(c => [{ text: WORD[c], color: RING[c].color }]), dim(' · '))]] : []),
      ...(memory.length ? [[dim('memory  '), dim(memory.map(n => n.path).sort().join(' · '))]] : []),
    ], dim('  ')),
  ]
}
