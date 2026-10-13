import { expect, test } from 'claude-code/testing'
import { CANVAS, folderOf, seedPoint } from '../../hooks/layout/seed'
import { SURFACES, decode, mount, node, start, ui, viewLaidOut } from './kit'

const COLUMNS = 64
const ROWS = 28 // a 30-row pane less the view keys and the meter line
const at = (x: number, y: number) => Math.floor((y / CANVAS.height) * ROWS) * COLUMNS + Math.floor((x / CANVAS.width) * COLUMNS)
const raster = async ($: any) => decode(await (await mount($, 'terminal', COLUMNS, 30)).find({ type: 'Raster' }))

test('F09-R5 two nodes apart with an edge: half blocks between them, both glyphs on top', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1), node('b.ts', 2, { state: 'partial' })], [['a.ts', 'b.ts']], { 'a.ts': { x: 10, y: 10 }, 'b.ts': { x: 90, y: 50 } })
  await start($)
  const cells = await raster($)
  expect(cells[at(10, 10)]!.char).toBe('●')
  expect(cells[at(90, 50)]!.char).toBe('◐')
  // Midway between the two columns the line crosses, strictly between the rows of the two glyphs.
  const mid = cells.filter((_, i) => i % COLUMNS === 31 && i >= at(10, 10) && i <= at(90, 50))
  expect(mid.some(c => c.char === '▀' || c.char === '▄')).toBe(true)
})

test('F09-R5 no edge, no half blocks', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1), node('b.ts', 2)], [], { 'a.ts': { x: 10, y: 10 }, 'b.ts': { x: 90, y: 50 } })
  await start($)
  expect((await raster($)).filter(c => c.char === '▀' || c.char === '▄')).toHaveLength(0)
})

test('F09-R5 an edge to a file the graph does not hold is not drawn', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1)], [['a.ts', 'gone.ts']], { 'a.ts': { x: 10, y: 10 } })
  await start($)
  expect((await raster($)).filter(c => c.char === '▀' || c.char === '▄')).toHaveLength(0)
})

test('F09-R9 a node is drawn at its position; one without is drawn at its folder\'s seed point', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1), node('src/b.ts', 2, { state: 'search' })], [], { 'a.ts': { x: 10, y: 10 } })
  await start($)
  const cells = await raster($)
  const seed = seedPoint(folderOf('src/b.ts'))
  expect(cells[4 * COLUMNS + 6]!.char).toBe('●') // x 10 of 100 → column 6 of 64, y 10 of 64 → row 4 of 28
  expect(cells[at(seed.x, seed.y)]!.char).toBe('◌')
})

test('NFR-P3 a render of 60 nodes and 120 edges builds its tree in under 16 ms on each surface', async ($, on) => {
  ui(on, { isPlaced: true }, SURFACES)
  const nodes = Array.from({ length: 60 }, (_, i) => node(`src/d${i % 6}/f${i}.ts`, i + 1))
  const edges = Array.from({ length: 120 }, (_, i) => [nodes[i % 60]!.path, nodes[(i * 7 + 1) % 60]!.path] as [string, string])
  viewLaidOut(on, nodes, edges, Object.fromEntries(nodes.map((n, i) => [n.path, { x: (i * 37) % 100, y: (i * 23) % 64 }])))
  await start($)
  for (const surface of SURFACES) {
    const times: number[] = []
    for (let i = 0; i < 5; i++) { // the best of five: the suite runs its files in parallel
      const t = performance.now()
      const pane = await mount($, surface, 120, 50)
      times.push(performance.now() - t)
      await pane.unmount()
    }
    expect(Math.min(...times), surface).toBeLessThan(16)
  }
})
