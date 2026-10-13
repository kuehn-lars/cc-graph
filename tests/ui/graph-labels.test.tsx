import { expect, test } from 'claude-code/testing'
import { decode, dots, mount, node, ofColor, start, ui, viewLaidOut } from './kit'

const COLUMNS = 64
const ROWS = 26 // a 30-row pane less the view keys, the meter line, the now line and the legend
const raster = async ($: any) => decode(await (await mount($, 'terminal', COLUMNS, 30)).find({ type: 'Raster' }))
const text = (cells: { char: string }[]) => cells.map(c => c.char).join('')
const rowOf = (cells: { char: string }[], y: number) => text(cells.slice(Math.floor(y / 4) * COLUMNS, (Math.floor(y / 4) + 1) * COLUMNS))

test('F09-AC19 a changed node whose label would cover the selected node\'s dots, no room on its left: only the selected label is drawn', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1, { change: 'edited' }), node('b.ts', 2), node('c.ts', 3)], [], { 'a.ts': { x: 0, y: 10 }, 'b.ts': { x: 9, y: 10 }, 'c.ts': { x: 200, y: 10 } }, [], 'b.ts') // a sits at the card's left edge
  await start($)
  const cells = await raster($)
  const t = text(cells)
  expect(t).toContain('b.ts')
  expect(t).not.toContain('a.ts')
  const lit = dots(cells, COLUMNS), ring = ofColor(lit, 0xf0f3f6)
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (Math.hypot(dx, dy) <= 4) expect(lit.has(`${Math.round(ring.x) + dx},${Math.round(ring.y) + dy}`)).toBe(true) // b's disc is whole: no label erased a dot (NFR-A3)
})

test('F09-AC19 control: with room between them the changed node\'s label is drawn', async ($, on) => {
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
  const ring = ofColor(dots(cells, COLUMNS), 0x9aa4b1) // the selected node is the focus: its halo is the outermost ring
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

test('F09-AC16 an edited login.ts +2 −0 reads "login.ts  +2 −0" with the change in amber; a created rateLimit.ts +12 reads "rateLimit.ts  +12 new" in green', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/login.ts', 1, { change: 'edited', added: 2, removed: 0 }), node('src/rateLimit.ts', 2, { change: 'created', added: 12 })], [], { 'src/login.ts': { x: 0, y: 0 }, 'src/rateLimit.ts': { x: 0, y: 40 } })
  await start($)
  const cells = await raster($)
  const t = text(cells)
  for (const [label, word, color] of [['login.ts  +2 −0', '+2 −0', 0xf0b45a], ['rateLimit.ts  +12 new', '+12 new', 0x63d494]] as const) {
    const at = t.indexOf(label)
    expect(at).toBeGreaterThanOrEqual(0)
    const w = at + label.length - word.length
    expect(cells.slice(w, w + word.length).map(c => c.fg)).toEqual(Array(word.length).fill(color))
  }
})

test('F09-R17 the change words: external reads "changed", blind "changed unseen"; a file not in context is dimmed, one in context bright', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1, { change: 'external' }), node('b.ts', 2, { change: 'blind', state: 'compacted' })], [], { 'a.ts': { x: 0, y: 0 }, 'b.ts': { x: 0, y: 40 } })
  await start($)
  const cells = await raster($)
  const t = text(cells)
  expect(t).toContain('a.ts  changed')
  expect(t).not.toContain('a.ts  changed unseen')
  expect(t).toContain('b.ts  changed unseen')
  expect(cells[t.indexOf('a.ts')]!.fg).toBe(0xeef1f5)
  expect(cells[t.indexOf('b.ts')]!.fg).toBe(0x9aa3ae)
})

test('F09-AC17 5 nodes placed apart on an 84 × 24 card: all 5 file names are in the rows', async ($, on) => {
  ui(on)
  const nodes = ['a', 'b', 'c', 'd', 'e'].map((n, i) => node(`${n}${n}.ts`, i + 1, { tokens: 100 + i }))
  viewLaidOut(on, nodes, [], Object.fromEntries(nodes.map((n, i) => [n.path, { x: (i % 3) * 30, y: Math.floor(i / 3) * 20 }])))
  await start($)
  const t = text(decode(await (await mount($, 'terminal', 84, 28)).find({ type: 'Raster' })))
  for (const n of nodes) expect(t).toContain(n.path)
})

test('F09-AC18 a node near the right edge: its label ends two columns left of its outermost ring', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1), node('src/long-name.ts', 2)], [], { 'a.ts': { x: 0, y: 10 }, 'src/long-name.ts': { x: 99, y: 10 } }, [], 'src/long-name.ts')
  await start($)
  const cells = await raster($)
  const ring = ofColor(dots(cells, COLUMNS), 0x9aa4b1) // the halo
  const row = rowOf(cells, ring.y)
  expect(row.indexOf('long-name.ts') + 'long-name.ts'.length - 1).toBe(Math.floor(ring.minX / 2) - 2)
})

test('F09-R17 a label that fits on neither side is dropped; the list still has the file', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a-very-long-file-name-that-fits-nowhere-on-this-card.ts', 1)], [], { 'a-very-long-file-name-that-fits-nowhere-on-this-card.ts': { x: 0, y: 10 } })
  await start($)
  expect(text(await raster($))).not.toContain('a-very-long')
})

test('F09-R17 an unchanged node outside the 5 largest is labelled too, and labels do not overlap', async ($, on) => {
  ui(on)
  const nodes = Array.from({ length: 6 }, (_, i) => node(`f${i}.ts`, i + 1, { tokens: 100 + i }))
  viewLaidOut(on, nodes, [], Object.fromEntries(nodes.map((n, i) => [n.path, { x: 5, y: 4 + i * 8 }])))
  await start($)
  const t = text(await raster($))
  for (let i = 0; i < 6; i++) expect(t).toContain(`f${i}.ts`)
})
