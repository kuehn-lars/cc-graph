import { expect, test } from 'claude-code/testing'
import { replay } from '../events/kit'
import { decode, dots, mount, node, ofColor, start, ui, viewGraph, viewLaidOut } from './kit'

const COLUMNS = 100
const LIT = 0x8a94a3, EDGE = 0x353a42, HALO = 0x9aa4b1
const now = async (pane: any): Promise<string | undefined> => (await pane.find({ type: 'Text', text: /^(◉ now|Nothing read yet\.)/ }))?.text

// login.test.ts touched last; the others are compacted so the in-context dots are its body alone.
const chain = (selected: string | null = null) => ({
  nodes: [
    node('test/login.test.ts', 4),
    node('src/auth/login.ts', 3, { state: 'compacted' }),
    node('src/auth/password.ts', 2, { state: 'compacted' }),
    node('test/helpers.ts', 1, { state: 'compacted' }),
  ],
  edges: [['test/login.test.ts', 'src/auth/login.ts'], ['test/login.test.ts', 'test/helpers.ts'], ['src/auth/login.ts', 'src/auth/password.ts']] as [string, string][],
  layout: { 'test/login.test.ts': { x: 50, y: 10 }, 'src/auth/login.ts': { x: 25, y: 32 }, 'src/auth/password.ts': { x: 25, y: 54 }, 'test/helpers.ts': { x: 75, y: 32 } },
  selected,
})

async function card($: any, on: any, selected: string | null = null) {
  const c = chain(selected)
  ui(on)
  viewLaidOut(on, c.nodes, c.edges, c.layout, [], c.selected)
  await start($)
  return decode(await (await mount($, 'terminal', COLUMNS, 40)).find({ type: 'Raster' }))
}

test('F09-AC20 the node touched last has lit edges and a dotted halo; other edges recede', async ($, on) => {
  const lit = dots(await card($, on), COLUMNS)
  expect([...lit.values()]).toContain(LIT)
  expect([...lit.values()]).toContain(EDGE)
  const body = ofColor(lit, 0x7aa7ff), halo = ofColor(lit, HALO)
  expect([halo.x, halo.y]).toEqual([body.x, body.y])
  expect(halo.maxX - halo.minX).toBe(body.maxX - body.minX + 8) // 4 dots outside on each side
  const ring = halo.points.length
  expect(ring).toBeGreaterThan(8)
  expect(ring).toBeLessThan(Math.PI * (halo.maxX - halo.minX)) // every other dot, not a full line
})

test('F09-AC20 a selected node is the focus instead: its edges are lit, the halo circles it', async ($, on) => {
  const lit = dots(await card($, on, 'src/auth/password.ts'), COLUMNS)
  const halo = ofColor(lit, HALO)
  expect(halo.y).toBeGreaterThan(ofColor(lit, 0x7aa7ff).y) // password.ts sits lowest; the halo is not on login.test.ts at the top
  expect([...lit.values()]).toContain(LIT)
  expect([...lit.values()]).toContain(EDGE) // login.test.ts's edges now recede
})

test('F09-R16 a selection that is no longer in the graph leaves the focus on the node touched last', async ($, on) => {
  const lit = dots(await card($, on, 'gone.ts'), COLUMNS)
  const halo = ofColor(lit, HALO), body = ofColor(lit, 0x7aa7ff)
  expect([halo.x, halo.y]).toEqual([body.x, body.y])
})

test('F09-R17 a focused node\'s label starts two columns right of its halo', async ($, on) => {
  const cells = await card($, on)
  const lit = dots(cells, COLUMNS), halo = ofColor(lit, HALO)
  const row = Math.floor(halo.y / 4), at = Math.floor(halo.maxX / 2)
  const line = cells.slice(row * COLUMNS, (row + 1) * COLUMNS).map(c => c.char).join('')
  expect(line.slice(at + 2).startsWith('login.test.ts')).toBe(true)
})

test('F09-AC21 after step 2 the now line reads "◉ now  src/auth/login.ts  · imports 2"', async ($, on) => {
  ui(on)
  viewGraph(on)
  await replay($, on, 2)
  expect(await now(await mount($, 'terminal'))).toBe('◉ now  src/auth/login.ts  · imports 2')
})

test('F09-AC21 on an empty graph the now line reads "Nothing read yet."', async ($, on) => {
  ui(on)
  viewGraph(on)
  await start($)
  expect(await now(await mount($, 'terminal'))).toBe('Nothing read yet.')
})

test('F09-R18 the now line carries the change word, then the list words', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/auth/login.ts', 2, { change: 'edited', added: 2 }), node('src/auth/password.ts', 1, { state: 'ghost' })], [['src/auth/login.ts', 'src/auth/password.ts']], {})
  await start($)
  const pane = await mount($, 'terminal', 100, 30)
  expect(await now(pane)).toBe('◉ now  src/auth/login.ts  +2 −0  · imports 1')
})

test('F09-R18 the now node is never a ghost', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('b.ts', 2, { state: 'ghost' }), node('a.ts', 1)], [], {})
  await start($)
  expect(await now(await mount($, 'terminal', 100, 30))).toBe('◉ now  a.ts')
})

test('F09-R18 a path wider than the pane is cut from its start and led by "…"', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/some/deep/folder/login.ts', 1)], [], {})
  await start($)
  const text = (await now(await mount($, 'terminal', 24, 30)))!
  expect([...text].length).toBeLessThanOrEqual(24)
  expect(text).toMatch(/^◉ now {2}….*login\.ts$/)
})

test('F09-AC4 the Raster gives up a row to the now line', async ($, on) => {
  ui(on)
  viewGraph(on, [], node('src/a.ts', 1))
  await start($)
  const raster = await (await mount($, 'terminal', 64, 30)).find({ type: 'Raster' })
  expect(raster?.props.rows).toBe(26) // 30 rows less the view keys, the meter line, the now line and the legend
})
