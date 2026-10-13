// Pure: F06. The import edges and ghosts a read, write or edit of `from` brings.
import type { Graph } from '../../types'
import { fresh } from './node'

/** F06-R6/R7/R10: each import links `from` to its first candidate, a ghost when that file has no node yet; one edge per pair, never a self-edge. */
export function withImports(g: Graph, from: string, imports: string[][] | undefined, turn: number): Graph {
  let out = g
  for (const [to] of imports ?? []) {
    if (to === undefined || to === from) continue
    // Nobody holds a ghost (`mainLoop` false, no agents), and it shares the event's `seq`.
    if (!out.files[to]) out = { ...out, files: { ...out.files, [to]: { ...fresh(to, turn), mainLoop: false, touched: out.seq } } }
    if (!out.edges.some(e => e.kind === 'import' && e.from === from && e.to === to))
      out = { ...out, edges: [...out.edges, { from, to, kind: 'import', blind: false, guessed: true }] }
  }
  return out
}
