import { expect, test } from 'claude-code/testing'
import { folderOf, seedPoint } from '../../hooks/layout/seed'
import { decode, dots, mount, node, ofColor, start, ui, viewLaidOut } from './kit'

const CARD = 0x14161b
const DEFAULT = 0x01000000 // the terminal's own colour
const IN_CONTEXT = 0x7aa7ff
const GREY = 0x5f6672
const GHOST = 0x7d8590
const EDGE = 0x353a42
const HALO = 0x9aa4b1
const AMBER = 0xf0b45a
const WHITE = 0xf0f3f6
const near = (r: number) => (dx: number, dy: number) => Math.round(Math.hypot(dx, dy)) === r

const draw = async ($: any, columns: number, rows: number) => {
  await start($)
  const cells = decode(await (await mount($, 'terminal', columns, rows + 4)).find({ type: 'Raster' })) // the pane gives 4 rows to the view keys, the meter line, the now line and the legend
  const lit = dots(cells, columns)
  for (const [k, c] of lit) if (c === HALO) lit.delete(k) // the focus's halo is read in graph-focus
  return { cells, lit }
}

test('F09-AC13 an 84 × 24 Raster is a card: rounded half-block corners in #14161b, card background everywhere else', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/a.ts', 1)], [], { 'src/a.ts': { x: 50, y: 30 } })
  const { cells } = await draw($, 84, 24)
  const row = (r: number) => cells.slice(r * 84, r * 84 + 84)
  expect(row(0).map(c => c.char).join('')).toBe(`▗${'▄'.repeat(82)}▖`)
  expect(row(23).map(c => c.char).join('')).toBe(`▝${'▀'.repeat(82)}▘`)
  for (const r of [0, 23]) for (const c of row(r)) expect([c.fg, c.bg]).toEqual([CARD, DEFAULT])
  expect(cells.slice(84, 84 * 23).every(c => c.bg === CARD)).toBe(true)
  expect(cells.slice(84, 84 * 23).filter(c => '▀▄'.includes(c.char))).toHaveLength(0)
  expect(cells.slice(84, 84 * 23).filter((_, i) => i % 84 === 0 || i % 84 === 83).every(c => c.char === ' ')).toBe(true) // first and last columns stay empty
})

test('F09-AC14 src/a.ts read, 400 tokens, alone: its centre cell is ⣿ in #7aa7ff, its dots a disc of radius 9', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/a.ts', 1, { tokens: 400 })], [], { 'src/a.ts': { x: 50, y: 30 } })
  const { cells, lit } = await draw($, 84, 24)
  const body = ofColor(lit, IN_CONTEXT)
  expect(body.points.length).toBe(lit.size) // nothing else is lit
  expect([body.maxX - body.minX, body.maxY - body.minY]).toEqual([18, 18])
  const centre = cells[Math.floor(body.y / 4) * 84 + Math.floor(body.x / 2)]!
  expect([centre.char, centre.fg]).toEqual(['⣿', IN_CONTEXT])
  for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++)
    expect(lit.has(`${body.x + dx},${body.y + dy}`), `${dx},${dy}`).toBe(Math.round(Math.hypot(dx, dy)) <= 9)
})

test('F09-AC15 a compacted node is an outline in #5f6672 with an empty centre; a ghost is a cross in #7d8590', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/a.ts', 1, { tokens: 400 }), node('src/b.ts', 2, { tokens: 400, state: 'compacted' }), node('src/c.ts', 3, { state: 'ghost' })], [],
    { 'src/a.ts': { x: 10, y: 10 }, 'src/b.ts': { x: 50, y: 30 }, 'src/c.ts': { x: 90, y: 50 } })
  const { cells, lit } = await draw($, 84, 24)
  const ring = ofColor(lit, GREY)
  const middle = cells[Math.floor(ring.y / 4) * 84 + Math.floor(ring.x / 2)]!
  expect(middle.char.codePointAt(0)! < 0x2800).toBe(true) // no dot in the centre cell
  expect([lit.get(`${ring.x - 9},${ring.y}`), lit.get(`${ring.x + 9},${ring.y}`)]).toEqual([GREY, GREY])
  expect(ring.points.every(([x, y]) => near(9)(x - ring.x, y - ring.y))).toBe(true)
  const cross = ofColor(lit, GHOST)
  for (const k of [0, 1, 2]) for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const)
    expect(lit.get(`${cross.x + sx * k},${cross.y + sy * k}`)).toBe(GHOST)
  expect(cross.points.every(([x, y]) => Math.abs(x - cross.x) === Math.abs(y - cross.y))).toBe(true)
})

test('F09-AC27 one node is drawn at the centre of the dot area', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/a.ts', 1)], [], { 'src/a.ts': { x: 3, y: 60 } })
  const one = ofColor((await draw($, 84, 24)).lit, IN_CONTEXT)
  expect(Math.abs(one.x - 83.5)).toBeLessThanOrEqual(1) // the card's centre: 84 columns of 2 dots
  expect(Math.abs(one.y - 47.5)).toBeLessThanOrEqual(1) // 24 rows of 4 dots
})

test('F09-AC27 two nodes 10 units apart on the same row sit the same number of dots from the centre on either side', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/a.ts', 1), node('src/b.ts', 2, { state: 'search' })], [], { 'src/a.ts': { x: 20, y: 7 }, 'src/b.ts': { x: 30, y: 7 } })
  const { lit } = await draw($, 84, 24)
  const [a, b] = [ofColor(lit, IN_CONTEXT), ofColor(lit, 0x5fc4d6)]
  expect(a.x + b.x).toBe(167) // symmetric about 83.5, the middle of 168 dots
  expect(a.y).toBe(b.y)
  expect(Math.abs(a.y - 47.5)).toBeLessThanOrEqual(1)
})

// A cell holds one colour, so a ring's dots recolour any body or inner-ring dots that share their cell: the tests read the rings, not the bodies.
test('F09-R15 a changed node wears a one-dot ring of its change\'s colour 3 dots outside its radius; the selected node a white one 2 further out', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/a.ts', 1, { tokens: 400, change: 'edited' })], [], { 'src/a.ts': { x: 50, y: 30 } }, [], 'src/a.ts')
  const { lit } = await draw($, 84, 24)
  const white = ofColor(lit, WHITE)
  expect([white.maxX - white.minX, white.maxY - white.minY]).toEqual([28, 28]) // radius 9 + 5
  for (let dy = -14; dy <= 14; dy++) for (let dx = -14; dx <= 14; dx++) {
    if (near(14)(dx, dy)) expect(lit.get(`${white.x + dx},${white.y + dy}`), `white ${dx},${dy}`).toBe(WHITE)
    if (near(12)(dx, dy)) expect([AMBER, WHITE], `amber ${dx},${dy}`).toContain(lit.get(`${white.x + dx},${white.y + dy}`))
  }
  expect(ofColor(lit, AMBER).points.length).toBeGreaterThan(40)
  expect(ofColor(lit, AMBER).points.every(([x, y]) => Math.round(Math.hypot(x - white.x, y - white.y)) <= 12)).toBe(true)
})

test('F09-R15 a selected node without a change has its white ring 3 dots outside its radius', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/a.ts', 1, { tokens: 400 })], [], { 'src/a.ts': { x: 50, y: 30 } }, [], 'src/a.ts')
  const { lit } = await draw($, 84, 24)
  const white = ofColor(lit, WHITE)
  expect([white.maxX - white.minX, white.maxY - white.minY]).toEqual([24, 24])
  for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) if (near(12)(dx, dy)) expect(lit.get(`${white.x + dx},${white.y + dy}`)).toBe(WHITE)
})

test('F09-R15 the radius follows √tokens against the largest file; a ghost has 2, unknown tokens 3', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1, { tokens: 400 }), node('b.ts', 2, { tokens: 100, state: 'search' }), node('c.ts', 3, { tokens: null, state: 'compacted' })], [],
    { 'a.ts': { x: 10, y: 10 }, 'b.ts': { x: 50, y: 30 }, 'c.ts': { x: 90, y: 50 } })
  const { lit } = await draw($, 84, 24)
  const width = (c: number) => { const o = ofColor(lit, c); return o.maxX - o.minX }
  expect(width(IN_CONTEXT)).toBe(18) // 2 + 7
  expect(width(0x5fc4d6)).toBe(12) // 2 + round(3.5) = 6
  expect(width(GREY)).toBe(6) // 3
})

test('F09-R14 a node at the edge of the layout keeps its whole outer ring inside the card', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1, { tokens: 400, change: 'edited' }), node('b.ts', 2, { tokens: 400 })], [], { 'a.ts': { x: 0, y: 0 }, 'b.ts': { x: 100, y: 64 } }, [], 'a.ts')
  const white = ofColor((await draw($, 84, 24)).lit, WHITE)
  expect([white.maxX - white.minX, white.maxY - white.minY]).toEqual([28, 28]) // not cut by the edge of the dot area
  expect([white.minX >= 2, white.minY >= 4]).toEqual([true, true]) // inside the card's first column and row
})

test('F09-R16 an import edge is a dotted line of #353a42 from ring to ring, and an edge to a missing file is not drawn', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1), node('b.ts', 2, { state: 'partial' }), node('c.ts', 3, { state: 'compacted' })], [['a.ts', 'b.ts'], ['a.ts', 'gone.ts']], { 'a.ts': { x: 10, y: 10 }, 'b.ts': { x: 90, y: 50 }, 'c.ts': { x: 50, y: 30 } }) // c.ts is touched last, so it is the focus
  const { lit } = await draw($, 84, 24)
  const edge = ofColor(lit, EDGE).points
  expect(edge.length).toBeGreaterThan(10)
  const nodes = ofColor(lit, IN_CONTEXT) // both nodes are in context: their bounding box holds the line
  for (const [x, y] of edge) for (const [x2, y2] of edge) if (x !== x2 || y !== y2) expect(Math.max(Math.abs(x - x2), Math.abs(y - y2))).toBeGreaterThan(1) // every other dot: none touch
  expect(edge.every(([x, y]) => x > nodes.minX && x < nodes.maxX && y > nodes.minY && y < nodes.maxY)).toBe(true)
})

test('F09-R16 no edge, no edge dots', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1), node('b.ts', 2)], [], { 'a.ts': { x: 10, y: 10 }, 'b.ts': { x: 90, y: 50 } })
  expect(ofColor((await draw($, 84, 24)).lit, EDGE).points).toHaveLength(0)
})

test('F09-R9 a node without a position is drawn at its folder\'s seed point', async ($, on) => {
  const seed = seedPoint(folderOf('src/b.ts'))
  ui(on)
  viewLaidOut(on, [node('a.ts', 1), node('src/b.ts', 2, { state: 'search' })], [], { 'a.ts': { x: 10, y: 10 } })
  const { lit } = await draw($, 84, 24)
  const [a, b] = [ofColor(lit, IN_CONTEXT), ofColor(lit, 0x5fc4d6)]
  const scale = Math.min(164 / Math.max(Math.abs(seed.x - 10) + 16, 40), 88 / Math.max(Math.abs(seed.y - 10) + 16, 26)) // R14's fit
  expect(Math.abs(b.x - a.x - (seed.x - 10) * scale)).toBeLessThanOrEqual(1.5)
  expect(Math.abs(b.y - a.y - (seed.y - 10) * scale)).toBeLessThanOrEqual(1.5)
})

test('F09-R12 a cell with no dot holds a grid dot in #262a31 where its column in the dot area is a multiple of 4 and its row is even', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/a.ts', 1)], [], { 'src/a.ts': { x: 50, y: 30 } })
  const { cells } = await draw($, 84, 24)
  const at = (col: number, row: number) => cells[row * 84 + col]!
  expect([at(1, 1).char, at(1, 1).fg]).toEqual(['·', 0x262a31])
  expect([at(5, 1).char, at(5, 3).char]).toEqual(['·', '·'])
  expect([at(2, 1).char, at(1, 2).char, at(4, 1).char]).toEqual([' ', ' ', ' '])
})

test('F09-R15 the radius scales by columns / 84 in a Raster under 84 columns', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/a.ts', 1, { tokens: 400 })], [], { 'src/a.ts': { x: 50, y: 30 } })
  const body = ofColor((await draw($, 42, 14)).lit, IN_CONTEXT)
  expect(body.maxX - body.minX).toBe(10) // round(9 × 42 / 84) = 5
})

test('F09-R15 a search node is a dotted circle: no two dots of its ring touch', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/a.ts', 1, { tokens: 400, state: 'search' })], [], { 'src/a.ts': { x: 50, y: 30 } })
  const ring = ofColor((await draw($, 84, 24)).lit, 0x5fc4d6).points
  expect(ring.length).toBeGreaterThan(20)
  for (const [x, y] of ring) expect(ring.filter(([x2, y2]) => Math.max(Math.abs(x - x2), Math.abs(y - y2)) === 1).length, `${x},${y}`).toBeLessThanOrEqual(2)
})
