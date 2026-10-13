// Pure: the two legend lines under the graph (F09-R28).
import type { Change, Graph, MemoryNote, NodeState } from '../../types'
import { COLOR, GLYPH, RING } from './cells'
import type { Seg } from './width'

// F09-R28: the states in GLYPH's order, and what each glyph says.
const WORDS: Record<NodeState, string> = { read: 'in context', partial: 'partly read', search: 'search hits only', compacted: 'compacted', unread: 'unread', ghost: 'never opened' }
const WORD: Record<Change, string> = { edited: 'edited', created: 'created', deleted: 'deleted', external: 'changed', blind: 'changed unseen' }
const join = (groups: Seg[][], sep: Seg): Seg[] => groups.flatMap((g, i) => (i ? [sep, ...g] : g))
const dim = (text: string): Seg => ({ text, dim: true })

/** `● in context  ◐ partly read  ━ size`, then `changes  edited · created  memory  CLAUDE.md`: what is on screen, and no other; a line with nothing to name is empty. */
export function legendLines(graph: Graph, memory: MemoryNote[]): [Seg[], Seg[]] {
  const files = Object.values(graph.files)
  const rings = (Object.keys(RING) as Change[]).filter(c => files.some(n => n.change === c))
  return [
    join([
      ...(Object.keys(GLYPH) as NodeState[]).filter(s => files.some(n => n.state === s)).map(s => [{ text: GLYPH[s], color: COLOR[s].key }, dim(` ${WORDS[s]}`)]),
      ...(files.some(n => n.state !== 'ghost' && n.tokens !== null) ? [[{ text: '━', color: COLOR.read.key }, dim(' size')]] : []), // the bar along a box's bottom
    ], dim('  ')),
    join([
      ...(rings.length ? [[dim('changes  '), ...join(rings.map(c => [{ text: WORD[c], color: RING[c].key }]), dim(' · '))]] : []),
      ...(memory.length ? [[dim('memory  '), dim(memory.map(n => n.path).sort().join(' · '))]] : []),
    ], dim('  ')),
  ]
}
