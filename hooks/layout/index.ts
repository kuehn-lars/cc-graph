// Pure: F09-R4, R13. (previous positions, graph) -> positions. A small force layout: nodes repel, import edges pull to REST apart and settle importers FLOW above, a node is drawn to its folder's seed point.
import type { Graph, Layout, Point } from '../../types'
import { CANVAS, folderOf, seedPoint, startPoint } from './seed'

const ITERATIONS = 200 // F09-R4
const MAX_MOVE = 2 // F09-R4: units a node may move in one pass
const REPEL = 40
const SPRING = 0.02
const REST = 14 // F09-R13: units an import edge pulls its ends to
const FLOW = 10 // F09-R13: units an importer sits above the file it imports
const BELOW = 8 // F09-R13: where a new node starts relative to its placed neighbour
const PULL = 0.01
const STEP = 0.05

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** F09-R13: a new node starts below its most recently touched placed importer, else above the most recently touched placed file it imports, else at its folder's seed point (offset by a hash of its path). */
function startOf(path: string, previous: Layout, graph: Graph): Point {
  const offset = startPoint(path)
  const newest = (paths: string[]) => paths.filter(p => previous[p]).sort((a, b) => (graph.files[b]?.touched ?? 0) - (graph.files[a]?.touched ?? 0) || (a < b ? -1 : 1))[0]
  const importer = newest(graph.edges.filter(e => e.kind === 'import' && e.to === path).map(e => e.from))
  if (importer) return { x: clamp(previous[importer]!.x + offset.x - seedPoint(folderOf(path)).x, 0, CANVAS.width), y: clamp(previous[importer]!.y + BELOW, 0, CANVAS.height) }
  const imported = newest(graph.edges.filter(e => e.kind === 'import' && e.from === path).map(e => e.to))
  if (imported) return { x: clamp(previous[imported]!.x + offset.x - seedPoint(folderOf(path)).x, 0, CANVAS.width), y: clamp(previous[imported]!.y - BELOW, 0, CANVAS.height) }
  return offset
}

export function layout(previous: Layout, graph: Graph): Layout {
  const paths = Object.keys(graph.files).sort() // sorted, so the order of insertion never changes the result
  const start = paths.map(p => previous[p] ?? startOf(p, previous, graph))
  const pos = start.map(p => ({ ...p }))
  const home = paths.map(p => seedPoint(folderOf(p)))
  const index = new Map(paths.map((p, i) => [p, i]))
  const links = graph.edges.flatMap(e => {
    const a = index.get(e.from), b = index.get(e.to)
    return a === undefined || b === undefined || e.kind !== 'import' ? [] : [[a, b] as const]
  })
  const linked = new Set(links.flatMap(([a, b]) => [a * paths.length + b, b * paths.length + a]))
  for (let it = 0; it < ITERATIONS; it++) {
    const force = pos.map((_, i) => ({ x: (home[i]!.x - pos[i]!.x) * PULL, y: (home[i]!.y - pos[i]!.y) * PULL }))
    for (let i = 0; i < pos.length; i++)
      for (let j = i + 1; j < pos.length; j++) {
        if (linked.has(i * pos.length + j)) continue // F09-R13: the spring alone sets an import edge's length
        const dx = pos[i]!.x - pos[j]!.x, dy = pos[i]!.y - pos[j]!.y
        const d2 = Math.max(dx * dx + dy * dy, 1)
        const f = REPEL / d2
        force[i]!.x += dx * f; force[i]!.y += dy * f
        force[j]!.x -= dx * f; force[j]!.y -= dy * f
      }
    for (const [a, b] of links) {
      const dx = pos[b]!.x - pos[a]!.x, dy = pos[b]!.y - pos[a]!.y
      const d = Math.max(Math.hypot(dx, dy), 0.01)
      const f = (d - REST) * SPRING / d
      force[a]!.x += dx * f; force[a]!.y += dy * f
      force[b]!.x -= dx * f; force[b]!.y -= dy * f
    }
    pos.forEach((p, i) => {
      p.x = clamp(p.x + force[i]!.x * STEP, 0, CANVAS.width)
      p.y = clamp(p.y + force[i]!.y * STEP, 0, CANVAS.height)
    })
    // F09-R13: an importer less than FLOW above what it imports is pushed apart vertically, half the shortfall each.
    for (const [a, b] of links) {
      const shortfall = FLOW - (pos[b]!.y - pos[a]!.y)
      if (shortfall <= 0) continue
      pos[a]!.y = clamp(pos[a]!.y - shortfall / 2, 0, CANVAS.height)
      pos[b]!.y = clamp(pos[b]!.y + shortfall / 2, 0, CANVAS.height)
    }
  }
  // F09-R4: however far the forces pushed, no node with an earlier position ends more than MAX_MOVE from it; R13: a new node moves freely.
  return Object.fromEntries(paths.map((path, i) => {
    if (!previous[path]) return [path, pos[i]!]
    const dx = pos[i]!.x - start[i]!.x, dy = pos[i]!.y - start[i]!.y
    const d = Math.hypot(dx, dy)
    const k = d > MAX_MOVE ? MAX_MOVE / d : 1
    return [path, { x: start[i]!.x + dx * k, y: start[i]!.y + dy * k }]
  }))
}

const edgeKey = (e: Graph['edges'][number]) => `${e.from}\0${e.to}\0${e.kind}`

/** F09-R4: whether nodes or edges were added or removed between two graphs (a changed node alone is not). */
export function reshaped(a: Graph, b: Graph): boolean {
  const ka = Object.keys(a.files), kb = Object.keys(b.files)
  return ka.length !== kb.length || ka.some(k => !(k in b.files)) || a.edges.length !== b.edges.length || a.edges.some((e, i) => edgeKey(e) !== edgeKey(b.edges[i]!))
}
