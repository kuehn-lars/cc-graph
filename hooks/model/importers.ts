// Pure: F07-R4. The files that import a changed one and that Claude has not opened.
import type { Graph } from '../../types'
import { ghost } from './node'

export type Importers = { type: 'importers'; path: string; importers: string[] }

/** Each importer with no node (or only a ghost) is a ghost with a `blind` import edge to the changed `path`; an importer Claude has opened is left alone. */
export const importers = (g: Graph, a: Importers, turn: number): Graph =>
  a.importers.reduce((g, from) => {
    if (g.files[from] && g.files[from]!.state !== 'ghost') return g
    const out = ghost(g, from, turn)
    const edge = { from, to: a.path, kind: 'import' as const, blind: true, guessed: false }
    return out.edges.some(e => e.kind === 'import' && e.from === from && e.to === a.path)
      ? { ...out, edges: out.edges.map(e => (e.kind === 'import' && e.from === from && e.to === a.path ? { ...e, blind: true } : e)) }
      : { ...out, edges: [...out.edges, edge] }
  }, g)
