import { expect, test } from 'claude-code/testing'
import { decode, dots, mount, node, ofColor, start, ui, viewLaidOut } from './kit'

const COLUMNS = 64
const IN_CONTEXT = 0x7aa7ff
const ROWS = 27 // a 30-row pane less the view keys, the meter line and the legend
const raster = async ($: any) => decode(await (await mount($, 'terminal', COLUMNS, 30)).find({ type: 'Raster' }))
const text = (cells: { char: string }[]) => cells.map(c => c.char).join('')
const rowOf = (cells: { char: string }[], y: number) => text(cells.slice(Math.floor(y / 4) * COLUMNS, (Math.floor(y / 4) + 1) * COLUMNS))

test('F09-AC6 a changed node whose label would cover the selected node\'s dots: only the selected label is drawn', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1, { change: 'edited' }), node('b.ts', 2)], [], { 'a.ts': { x: 10, y: 10 }, 'b.ts': { x: 19, y: 10 } }, [], 'b.ts')
  await start($)
  const cells = await raster($)
  const t = text(cells)
  expect(t).toContain('b.ts')
  expect(t).not.toContain('a.ts')
  expect(ofColor(dots(cells, COLUMNS), IN_CONTEXT).points.length).toBeGreaterThan(300) // both discs whole: no dots erased
})

test('F09-AC6 control: with room between them the changed node\'s label is drawn', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1, { change: 'edited' }), node('b.ts', 2)], [], { 'a.ts': { x: 10, y: 10 }, 'b.ts': { x: 40, y: 10 } }, [], 'b.ts')
  await start($)
  const t = text(await raster($))
  expect(t).toContain('a.ts')
})

test('F09-R17 a label starts two columns right of its node\'s outermost ring, on the row of its centre', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/a.ts', 1)], [], { 'src/a.ts': { x: 10, y: 10 } }, [], 'src/a.ts')
  await start($)
  const cells = await raster($)
  const ring = ofColor(dots(cells, COLUMNS), 0xf0f3f6) // the selected ring is the outermost
  expect(rowOf(cells, ring.y).indexOf('a.ts')).toBe(Math.floor(ring.maxX / 2) + 2)
})

test('F09-AC11 the selected node src/日本.ts: the Raster is drawn and its label reads ??.ts (derived: no recording has such a path)', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/日本.ts', 1)], [], { 'src/日本.ts': { x: 10, y: 10 } }, [], 'src/日本.ts')
  await start($)
  const cells = await raster($)
  expect(cells).toHaveLength(COLUMNS * ROWS)
  expect(text(cells)).toContain('??.ts')
})

test('F09-R17 a label running past the right edge is dropped', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1), node('src/long-name.ts', 2)], [], { 'a.ts': { x: 0, y: 10 }, 'src/long-name.ts': { x: 99, y: 10 } }, [], 'src/long-name.ts')
  await start($)
  const t = text(await raster($))
  expect(t).not.toContain('long')
})

test('F09-R17 an unchanged node outside the 5 largest gets no label', async ($, on) => {
  ui(on)
  const nodes = Array.from({ length: 6 }, (_, i) => node(`f${i}.ts`, i + 1, { tokens: 100 + i }))
  viewLaidOut(on, nodes, [], Object.fromEntries(nodes.map((n, i) => [n.path, { x: 5, y: 4 + i * 8 }])))
  await start($)
  const t = text(await raster($))
  expect(t).not.toContain('f0.ts')
  for (const i of [1, 2, 3, 4, 5]) expect(t).toContain(`f${i}.ts`)
})
