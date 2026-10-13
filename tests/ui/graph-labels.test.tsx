import { expect, test } from 'claude-code/testing'
import { CANVAS } from '../../hooks/layout/seed'
import { decode, mount, node, start, ui, viewLaidOut } from './kit'

const COLUMNS = 64
const ROWS = 27 // a 30-row pane less the view keys, the meter line and the legend
const col = (x: number) => Math.floor((x / CANVAS.width) * COLUMNS)
const row = (y: number) => Math.floor((y / CANVAS.height) * ROWS)
const raster = async ($: any) => decode(await (await mount($, 'terminal', COLUMNS, 30)).find({ type: 'Raster' }))
const text = (cells: { char: string }[]) => cells.map(c => c.char).join('')

test('F09-AC6 a changed node whose label would cover the selected node\'s cell: only the selected label is drawn', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1, { change: 'edited' }), node('b.ts', 2)], [], { 'a.ts': { x: 10, y: 10 }, 'b.ts': { x: 14, y: 10 } }, [], 'b.ts')
  await start($)
  const cells = await raster($)
  const t = text(cells)
  expect(t).toContain('b.ts')
  expect(t).not.toContain('a.ts')
  expect(cells.filter(c => c.char === '●')).toHaveLength(2) // no glyph erased
})

test('F09-R6 a label sits to the right of its cell', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/a.ts', 1)], [], { 'src/a.ts': { x: 10, y: 10 } }, [], 'src/a.ts')
  await start($)
  const cells = await raster($)
  const at = row(10) * COLUMNS + col(10)
  expect(cells[at]!.char).toBe('●')
  expect(text(cells.slice(at + 1, at + 5))).toBe('a.ts')
})

test('F09-AC11 the selected node src/日本.ts: the Raster is drawn and its label reads ??.ts (derived: no recording has such a path)', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/日本.ts', 1)], [], { 'src/日本.ts': { x: 10, y: 10 } }, [], 'src/日本.ts')
  await start($)
  const cells = await raster($)
  expect(cells).toHaveLength(COLUMNS * ROWS)
  expect(text(cells)).toContain('??.ts')
})

test('F09-R6 a label running past the right edge is dropped', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/long-name.ts', 1)], [], { 'src/long-name.ts': { x: 99, y: 10 } }, [], 'src/long-name.ts')
  await start($)
  const t = text(await raster($))
  expect(t).not.toContain('long')
  expect(t).not.toContain('.ts')
})

test('F09-R6 an unchanged node outside the 5 largest gets no label', async ($, on) => {
  ui(on)
  const nodes = Array.from({ length: 6 }, (_, i) => node(`f${i}.ts`, i + 1, { tokens: 100 + i }))
  viewLaidOut(on, nodes, [], Object.fromEntries(nodes.map((n, i) => [n.path, { x: 5, y: 4 + i * 8 }])))
  await start($)
  const t = text(await raster($))
  expect(t).not.toContain('f0.ts')
  for (const i of [1, 2, 3, 4, 5]) expect(t).toContain(`f${i}.ts`)
})
