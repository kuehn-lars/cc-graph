// Pure: the legend line under the graph (F09-R8).
import type { Graph, MemoryNote } from '../../types'
import { RING } from './cells'
import { GLYPH } from './list'

/** `● read  ◐ partial  ■ memory  amber edited`: every glyph and ring the graph draws, and no other. */
export function legendLine(graph: Graph, memory: MemoryNote[]) {
  const files = Object.values(graph.files)
  return [
    ...(Object.entries(GLYPH) as [keyof typeof GLYPH, string][]).filter(([s]) => files.some(n => n.state === s)).map(([s, g]) => `${g} ${s}`),
    ...(memory.length ? ['■ memory'] : []),
    ...(Object.entries(RING) as [keyof typeof RING, (typeof RING)[keyof typeof RING]][]).filter(([c]) => files.some(n => n.change === c)).map(([c, r]) => `${r.name} ${c}`),
  ].join('  ')
}
