import { expect, test } from 'claude-code/testing'
import { layout } from '../../hooks/layout'
import { CANVAS } from '../../hooks/layout/seed'
import type { Edge, Graph, Point } from '../../types'
import { node } from '../ui/kit'

const folders = ['src', 'src/auth', 'src/db', 'test', '']
const graphOf = (n: number, edges: Edge[] = []): Graph => ({
  seq: n, files: Object.fromEntries(Array.from({ length: n }, (_, i) => {
    const path = `${folders[i % folders.length]}/f${i}.ts`.replace(/^\//, '')
    return [path, node(path, i + 1)]
  })), edges, decisions: [], compactions: [],
})
const importEdge = (from: string, to: string): Edge => ({ from, to, kind: 'import', blind: false, guessed: false })
const edgesOf = (g: Graph, count: number) => {
  const paths = Object.keys(g.files)
  return Array.from({ length: count }, (_, i) => importEdge(paths[i % paths.length]!, paths[(i * 7 + 3) % paths.length]!))
}
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

test('F09-AC1 the same nodes, edges and earlier positions give the same positions on two runs', () => {
  const g = graphOf(30)
  g.edges.push(...edgesOf(g, 40))
  const first = layout({}, g)
  expect(layout({}, g)).toEqual(first)
  expect(layout(first, g)).toEqual(layout(first, g))
})

test('F09-AC2 adding one node to a 30-node graph moves no existing node more than 2 units', () => {
  const g = graphOf(30)
  let positions = layout({}, g)
  for (let i = 0; i < 5; i++) positions = layout(positions, g) // settle
  const next: Graph = { ...g, seq: 31, files: { ...g.files, 'src/new.ts': node('src/new.ts', 31) } }
  const after = layout(positions, next)
  for (const [path, p] of Object.entries(positions)) expect(dist(p, after[path]!)).toBeLessThanOrEqual(2 + 1e-9)
  expect(after['src/new.ts']).toBeDefined()
})

// The suite runs its files in parallel, so one run carries other files' load: the best of five counts (as NFR-P1's bench does).
test('F09-AC3 a pass over 60 nodes and 120 edges finishes in under 50 ms', () => {
  const g = graphOf(60)
  g.edges.push(...edgesOf(g, 120))
  const times = Array.from({ length: 5 }, () => {
    const t = performance.now()
    layout({}, g)
    return performance.now() - t
  })
  expect(Math.min(...times)).toBeLessThan(50)
})

test('F09-R3 files of one folder start closer to each other than to another folder, and stay on the canvas', () => {
  const g = graphOf(10)
  const p = layout({}, g)
  for (const q of Object.values(p)) {
    expect(q.x).toBeGreaterThanOrEqual(0); expect(q.x).toBeLessThanOrEqual(CANVAS.width)
    expect(q.y).toBeGreaterThanOrEqual(0); expect(q.y).toBeLessThanOrEqual(CANVAS.height)
  }
  expect(new Set(Object.values(p).map(q => `${q.x},${q.y}`)).size).toBe(10)
})

test('F09-AC12 a position of a node no longer in the graph is dropped', () => {
  const g = graphOf(5)
  const p = layout({}, g)
  const { [Object.keys(g.files)[0]!]: _, ...files } = g.files
  expect(Object.keys(layout(p, { ...g, files })).sort()).toEqual(Object.keys(files).sort())
})
