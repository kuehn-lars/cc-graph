// Pure: the legend line under the graph (F09-R8).
import type { Change, Graph, MemoryNote, NodeState } from '../../types'
import { RING } from './cells'
import { GLYPH } from './list'

/** `● read  ◐ partial  ■ memory  amber edited`: every glyph and ring the graph draws, and no other. */
export function legendLine(graph: Graph, memory: MemoryNote[]) {
  const files = Object.values(graph.files)
  return [
    ...(Object.keys(GLYPH) as NodeState[]).filter(s => files.some(n => n.state === s)).map(s => `${GLYPH[s]} ${s}`),
    ...(memory.length ? ['■ memory'] : []),
    ...(Object.keys(RING) as Change[]).filter(c => files.some(n => n.change === c)).map(c => `${RING[c].name} ${c}`),
  ].join('  ')
}
