// Pure: F06. The import edges and ghosts a read, write or edit of `from` brings.
import type { Graph } from '../../types'
import { ghost } from './node'

/** F06-R6/R7/R10: each import links `from` to its first candidate that is a confirmed (non-ghost) node, else to the first, marked `guessed` (a new ghost when it has no node); one edge per pair, never a self-edge. */
export function withImports(g: Graph, from: string, imports: string[][] | undefined, turn: number): Graph {
  let out = g
  for (const candidates of imports ?? []) {
    const known = candidates.find(c => out.files[c] && out.files[c]!.state !== 'ghost') // a ghost is itself a guess
    const to = known ?? candidates[0]
    if (to === undefined || to === from) continue
    out = ghost(out, to, turn)
    if (!out.edges.some(e => e.kind === 'import' && e.from === from && e.to === to))
      out = { ...out, edges: [...out.edges, { from, to, kind: 'import', blind: false, guessed: known === undefined }] }
  }
  return out
}
