import { expect, test } from 'claude-code/testing'
import { boxOf, decode, lines, mount, node, start, ui, viewLaidOut } from './kit'

const COLUMNS = 64
const ROWS = 25 // a 30-row pane less the view keys, the meter line, the now line and two legend lines
const raster = async ($: any) => decode(await (await mount($, 'terminal', COLUMNS, 30)).find({ type: 'Raster' }))

test('F09-AC11 the selected node src/日本.ts: the Raster is drawn and its box reads ??.ts (derived: no recording has such a path)', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/日本.ts', 1)], [], { 'src/日本.ts': { x: 10, y: 10 } }, [], 'src/日本.ts')
  await start($)
  const cells = await raster($)
  expect(cells).toHaveLength(COLUMNS * ROWS)
  expect(boxOf(cells, COLUMNS, '??.ts')?.rows[1]).toBe('│ ● ??.ts │')
})

test('F09-R24 the change words: external reads "changed", blind "changed unseen"', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1, { change: 'external' }), node('b.ts', 2, { change: 'blind', state: 'compacted' })], [], { 'a.ts': { x: 0, y: 0 }, 'b.ts': { x: 0, y: 40 } })
  await start($)
  const cells = await raster($)
  expect(boxOf(cells, COLUMNS, 'a.ts')!.rows[1]).toBe('│ ● a.ts  changed │')
  expect(boxOf(cells, COLUMNS, 'b.ts')!.rows[1]).toBe('┆ ○ b.ts  changed unseen ┆')
  expect(boxOf(cells, COLUMNS, 'b.ts')!.cell(10, 1).fg).toBe(0xff6b80)
})

test('F09-AC17 5 nodes placed apart on an 84 × 24 Raster: all 5 file names are in the rows', async ($, on) => {
  ui(on)
  const nodes = ['a', 'b', 'c', 'd', 'e'].map((n, i) => node(`${n}${n}.ts`, i + 1, { tokens: 100 + i }))
  viewLaidOut(on, nodes, [], Object.fromEntries(nodes.map((n, i) => [n.path, { x: (i % 3) * 30, y: Math.floor(i / 3) * 20 }])))
  await start($)
  const t = lines(decode(await (await mount($, 'terminal', 84, 29)).find({ type: 'Raster' })), 84).join('\n')
  for (const n of nodes) expect(t).toContain(n.path)
})

test('F09-R25 six nodes in a column are all drawn, none over another', async ($, on) => {
  ui(on)
  const nodes = Array.from({ length: 6 }, (_, i) => node(`f${i}.ts`, i + 1, { tokens: 100 + i }))
  viewLaidOut(on, nodes, [], Object.fromEntries(nodes.map((n, i) => [n.path, { x: 5, y: 4 + i * 8 }])))
  await start($)
  const cells = await raster($)
  for (let i = 0; i < 6; i++) expect(boxOf(cells, COLUMNS, `f${i}.ts`), `f${i}.ts`).toBeDefined()
})
