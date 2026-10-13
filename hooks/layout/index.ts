// Pure: F09-R3, R4. (previous positions, graph) -> positions. A small force layout: nodes repel, import edges pull, a node is drawn to its folder's seed point.
import type { Graph, Layout, Point } from '../../types'
import { CANVAS, folderOf, seedPoint, startPoint } from './seed'

const ITERATIONS = 200 // F09-R4
const MAX_MOVE = 2 // F09-R4: units a node may move in one pass
const REPEL = 40
const SPRING = 0.02
const PULL = 0.01
const STEP = 0.05

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function layout(previous: Layout, graph: Graph): Layout {
  const paths = Object.keys(graph.files).sort() // sorted, so the order of insertion never changes the result
  const start = paths.map(p => previous[p] ?? startPoint(p))
  const pos = start.map(p => ({ ...p }))
  const home = paths.map(p => seedPoint(folderOf(p)))
  const index = new Map(paths.map((p, i) => [p, i]))
  const links = graph.edges.flatMap(e => {
    const a = index.get(e.from), b = index.get(e.to)
    return a === undefined || b === undefined ? [] : [[a, b] as const]
  })
  for (let it = 0; it < ITERATIONS; it++) {
    const force = pos.map((_, i) => ({ x: (home[i]!.x - pos[i]!.x) * PULL, y: (home[i]!.y - pos[i]!.y) * PULL }))
    for (let i = 0; i < pos.length; i++)
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[i]!.x - pos[j]!.x, dy = pos[i]!.y - pos[j]!.y
        const d2 = Math.max(dx * dx + dy * dy, 1)
        const f = REPEL / d2
        force[i]!.x += dx * f; force[i]!.y += dy * f
        force[j]!.x -= dx * f; force[j]!.y -= dy * f
      }
    for (const [a, b] of links) {
      const dx = pos[b]!.x - pos[a]!.x, dy = pos[b]!.y - pos[a]!.y
      force[a]!.x += dx * SPRING; force[a]!.y += dy * SPRING
      force[b]!.x -= dx * SPRING; force[b]!.y -= dy * SPRING
    }
    pos.forEach((p, i) => {
      p.x = clamp(p.x + force[i]!.x * STEP, 0, CANVAS.width)
      p.y = clamp(p.y + force[i]!.y * STEP, 0, CANVAS.height)
    })
  }
  // F09-R4: however far the forces pushed, no node ends more than MAX_MOVE from where the pass found it.
  return Object.fromEntries(paths.map((path, i) => {
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
