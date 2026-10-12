// Pure: the text `/graph` answers where nothing draws (F08-R4). Blind spots (F07) join it when they ship.
import type { Fill, Graph, NodeState } from '../../types'
import { GLYPH } from './list'
import { meterLine } from './meter'

const STATES = Object.keys(GLYPH) as NodeState[] // GLYPH's key order is the state order of the summary
const CHANGES = ['edited', 'created', 'external', 'blind'] as const

/** The meter line (F03-R9), then `1 read, 1 partial`, then `2 edited` on a line of its own; zero counts are left out. */
export function summarize(graph: Graph, fill: Fill | null): string {
  const files = Object.values(graph.files)
  const line = (key: 'state' | 'change', words: readonly string[]) =>
    words.map(w => [files.filter(n => n[key] === w).length, w] as const).filter(([n]) => n).map(([n, w]) => `${n} ${w}`).join(', ')
  return [meterLine(graph, fill), line('state', STATES), line('change', CHANGES)].filter(Boolean).join('\n') + (files.length ? '' : '\nNothing read yet.')
}
