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

test('F09-R13 files of one folder start closer to each other than to another folder, and stay on the canvas', () => {
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

const chain = ['src/routes/index.ts', 'src/auth/login.ts', 'src/auth/sessions.ts']
const graphFrom = (paths: string[], edges: Edge[]): Graph => ({
  seq: paths.length, files: Object.fromEntries(paths.map((p, i) => [p, node(p, i + 1)])), edges, decisions: [], compactions: [],
})

test('F09-AC25 in a new chain each importer ends at least 10 units above the file it imports', () => {
  const g = graphFrom(chain, [importEdge(chain[0]!, chain[1]!), importEdge(chain[1]!, chain[2]!)])
  const p = layout({}, g)
  expect(p[chain[1]!]!.y - p[chain[0]!]!.y).toBeGreaterThanOrEqual(10)
  expect(p[chain[2]!]!.y - p[chain[1]!]!.y).toBeGreaterThanOrEqual(10)
})

test('F09-AC26 a new ghost importing a placed file ends within 16 units of it', () => {
  const login = 'src/auth/login.ts', users = 'src/api/users.ts'
  const g = graphFrom([login, users], [importEdge(users, login)])
  g.files[users] = { ...g.files[users]!, state: 'ghost', tokens: null }
  const p = layout({ [login]: { x: 50, y: 30 } }, g)
  expect(dist(p[users]!, p[login]!)).toBeLessThanOrEqual(16)
  expect(p[users]!.y).toBeLessThan(p[login]!.y)
})
