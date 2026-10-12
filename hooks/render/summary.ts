// Pure: the text `/graph` answers where nothing draws (F08-R4). The meter line (F03) and blind spots (F07) join it when they ship.
import type { Graph } from '../../types'

const STATES = ['read', 'partial', 'search', 'compacted', 'unread', 'ghost'] as const
const CHANGES = ['edited', 'created', 'external', 'blind'] as const

/** `1 read, 1 partial`, then `2 edited` on a line of its own; zero counts are left out. */
export function summarize(graph: Graph): string {
  const files = Object.values(graph.files)
  const line = (key: 'state' | 'change', words: readonly string[]) =>
    words.map(w => [files.filter(n => n[key] === w).length, w] as const).filter(([n]) => n).map(([n, w]) => `${n} ${w}`).join(', ')
  return [line('state', STATES), line('change', CHANGES)].filter(Boolean).join('\n') || 'Nothing read yet.'
}
