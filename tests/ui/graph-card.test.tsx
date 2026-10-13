import { expect, test } from 'claude-code/testing'
import { boxOf, decode, lines, mount, node, start, ui, viewLaidOut } from './kit'

const DEFAULT = 0x01000000 // the terminal's own colour
const CLAUDE = 0xd77757, IN_CONTEXT = 0xb1b9f9, SUBTLE = 0x505050, INACTIVE = 0x999999, CREATED = 0x4eba65, DELETED = 0xff6b80

const draw = async ($: any, columns: number, rows: number) => {
  await start($)
  return decode(await (await mount($, 'terminal', columns, rows + 5)).find({ type: 'Raster' })) // the pane gives 5 rows to the view keys, the meter line, the now line and two legend lines
}

test('F09-AC28 an 84 × 24 Raster is drawn on the terminal\'s own background: no card, no grid, no braille', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/a.ts', 1)], [], { 'src/a.ts': { x: 50, y: 30 } })
  const cells = await draw($, 84, 24)
  expect(cells.every(c => c.bg === DEFAULT)).toBe(true)
  expect(cells.filter(c => /[⠀-⣿▀▄·]/.test(c.char))).toHaveLength(0)
  expect(cells.filter(c => c.char === ' ').every(c => c.fg === DEFAULT)).toBe(true)
})

test('F09-AC29 an edited login.ts is a box holding its glyph, name and change word, its border in Claude\'s colour as the now node', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/auth/login.ts', 2, { tokens: 400, change: 'edited', added: 2 }), node('src/middleware/rateLimit.ts', 1, { change: 'created', added: 12 })], [],
    { 'src/auth/login.ts': { x: 20, y: 10 }, 'src/middleware/rateLimit.ts': { x: 80, y: 50 } })
  const cells = await draw($, 84, 24)
  const login = boxOf(cells, 84, 'login.ts')!
  expect(login.rows).toEqual(['╭───────────────────╮', '│ ● login.ts  +2 −0 │', '╰━━━━━━━━━━━━━━━━━━━╯'])
  expect(login.cell(2, 1).fg).toBe(IN_CONTEXT)
  expect([4, 11, 14, 15, 17, 18].map(x => login.cell(x, 1).fg)).toEqual([DEFAULT, DEFAULT, CREATED, CREATED, DELETED, DELETED]) // the name in the terminal's own colour, the counts as a diff colours them
  for (const [x, y] of [[0, 0], [20, 0], [0, 2], [20, 2], [0, 1]]) expect(login.cell(x!, y!).fg).toBe(CLAUDE)
  const rate = boxOf(cells, 84, 'rateLimit.ts')!
  expect(rate.rows[1]).toBe('│ ● rateLimit.ts  +12 new │')
  expect([...'+12 new'].map((_, k) => rate.cell(18 + k, 1).fg)).toEqual(Array(7).fill(CREATED))
  expect([[0, 0], [25, 0], [0, 2], [25, 2], [0, 1]].map(([x, y]) => rate.cell(x!, y!).fg)).toEqual(Array(5).fill(CREATED))
})

test('F09-AC30 a compacted node is a dashed box in the subtle colour, its name inactive; a ghost is a tag with no box', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/a.ts', 3), node('src/b.ts', 2, { state: 'compacted' }), node('src/c.ts', 1, { state: 'ghost', tokens: null })], [],
    { 'src/a.ts': { x: 10, y: 10 }, 'src/b.ts': { x: 50, y: 30 }, 'src/c.ts': { x: 90, y: 50 } })
  const cells = await draw($, 84, 24)
  const b = boxOf(cells, 84, 'b.ts')!
  expect(b.rows[0]).toMatch(/^╭┄+╮$/)
  expect(b.rows[1]).toBe('┆ ○ b.ts ┆')
  expect([b.cell(0, 0).fg, b.cell(0, 1).fg, b.cell(4, 1).fg, b.cell(2, 1).fg]).toEqual([SUBTLE, SUBTLE, INACTIVE, INACTIVE])
  const c = boxOf(cells, 84, 'c.ts')!
  expect(c.boxed).toBe(false)
  expect(c.rows).toEqual(['⋯ c.ts'])
  const row = lines(cells, 84)[c.top]!
  expect([row[c.left - 1], row[c.right + 1]]).toEqual([' ', ' ']) // no side of its own
})

test('F09-AC31 the size bar fills the bottom side by √(tokens / largest); unknown tokens have none', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1, { tokens: 400 }), node('b.ts', 2, { tokens: 100 }), node('c.ts', 3, { tokens: null })], [],
    { 'a.ts': { x: 10, y: 10 }, 'b.ts': { x: 50, y: 30 }, 'c.ts': { x: 90, y: 50 } })
  const cells = await draw($, 84, 24)
  const [a, b, c] = ['a.ts', 'b.ts', 'c.ts'].map(n => boxOf(cells, 84, n)!)
  expect(a!.rows[2]).toBe('╰━━━━━━━━╯')
  expect(b!.rows[2]).toBe('╰━━━━────╯')
  expect(c!.rows[2]).toBe('╰────────╯')
  expect([a!.cell(1, 2).fg, b!.cell(4, 2).fg]).toEqual([IN_CONTEXT, IN_CONTEXT])
})

test('F09-AC27 one node is drawn at the centre of the Raster', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/a.ts', 1)], [], { 'src/a.ts': { x: 3, y: 60 } })
  const a = boxOf(await draw($, 84, 24), 84, 'a.ts')!
  expect(Math.abs((a.left + a.right) / 2 - 41.5)).toBeLessThanOrEqual(1)
  expect(Math.abs((a.top + a.bottom) / 2 - 11.5)).toBeLessThanOrEqual(1)
})

test('F09-AC27 two nodes 10 units apart on the same row sit the same number of columns from the centre on either side', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/a.ts', 1), node('src/b.ts', 2)], [], { 'src/a.ts': { x: 20, y: 7 }, 'src/b.ts': { x: 30, y: 7 } })
  const cells = await draw($, 84, 24)
  const [a, b] = [boxOf(cells, 84, 'a.ts')!, boxOf(cells, 84, 'b.ts')!]
  expect(Math.abs(a.left + b.right - 83)).toBeLessThanOrEqual(1) // symmetric about the middle of 84 columns
  expect(a.top).toBe(b.top)
})

test('F09-AC32 three nodes on one point: all three boxes whole, 2 columns or 1 row apart', async ($, on) => {
  ui(on)
  const nodes = ['a', 'b', 'c'].map((n, i) => node(`${n}.ts`, i + 1))
  viewLaidOut(on, nodes, [], Object.fromEntries(nodes.map(n => [n.path, { x: 50, y: 30 }])))
  const cells = await draw($, 84, 24)
  const boxes = ['a.ts', 'b.ts', 'c.ts'].map(n => boxOf(cells, 84, n)!)
  for (const box of boxes) expect(box.boxed).toBe(true)
  for (const p of boxes) for (const q of boxes) if (p !== q)
    expect(p.right + 2 < q.left || q.right + 2 < p.left || p.bottom + 1 < q.top || q.bottom + 1 < p.top).toBe(true)
})

test('F09-AC32 twelve nodes on one point of a 64 × 8 Raster: some become tags, none share a cell', async ($, on) => {
  ui(on)
  const nodes = Array.from({ length: 12 }, (_, i) => node(`f${String(i).padStart(2, '0')}.ts`, i + 1))
  viewLaidOut(on, nodes, [], Object.fromEntries(nodes.map(n => [n.path, { x: 50, y: 30 }])))
  const cells = await draw($, 64, 8)
  const drawn = nodes.map(n => boxOf(cells, 64, n.path)).filter(b => b !== undefined)
  expect(drawn.some(b => !b!.boxed)).toBe(true)
  const seen = new Set<number>()
  for (const b of drawn) for (let y = b!.top; y <= b!.bottom; y++) for (let x = b!.left; x <= b!.right; x++) {
    expect(seen.has(y * 64 + x)).toBe(false)
    seen.add(y * 64 + x)
  }
})

test('F09-R30 a name too long for the Raster is left out; the list still has the file', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a-very-long-file-name-that-fits-nowhere-on-this-raster.ts', 1)], [], { 'a-very-long-file-name-that-fits-nowhere-on-this-raster.ts': { x: 0, y: 10 } })
  expect(lines(await draw($, 40, 24), 40).join('')).not.toContain('a-very-long')
})

test('F09-R9 a node without a position is drawn at its folder\'s seed point: two such nodes of one folder are moved apart, both drawn', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/a.ts', 1), node('src/b.ts', 2)], [], {})
  const cells = await draw($, 84, 24)
  expect([boxOf(cells, 84, 'a.ts')?.boxed, boxOf(cells, 84, 'b.ts')?.boxed]).toEqual([true, true])
})

test('F09-AC33 an edge from a box above to one below leaves the middle of its bottom side at ┬, enters the top side at one ┴, and runs in box-drawing lines', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/routes/index.ts', 1, { tokens: null }), node('src/auth/login.ts', 2, { tokens: null })], [['src/routes/index.ts', 'src/auth/login.ts']],
    { 'src/routes/index.ts': { x: 20, y: 10 }, 'src/auth/login.ts': { x: 70, y: 50 } })
  const cells = await draw($, 84, 24)
  const [up, down] = [boxOf(cells, 84, 'index.ts')!, boxOf(cells, 84, 'login.ts')!]
  const mid = (b: typeof up) => (b.right - b.left + 1) >> 1
  expect(up.cell(mid(up), 2).char).toBe('┬')
  expect(down.rows[0]!.split('┴')).toHaveLength(2) // where it crosses least: the folder's title is over the middle
  const between = lines(cells, 84).slice(up.bottom + 1, down.top).join('').replace(/ /g, '')
  expect(between.length).toBeGreaterThan(5)
  expect(between).toMatch(/^[│─╭╮╰╯┼]+(src\/auth\/[│─╭╮╰╯┼]*)?$/) // the folders' sides, crossed at ┼, and the lower folder's title
})

test('F09-R26 no edge, no lines; an edge to a missing file is not drawn', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1), node('b.ts', 2)], [['a.ts', 'gone.ts']], { 'a.ts': { x: 10, y: 10 }, 'b.ts': { x: 90, y: 50 } })
  const cells = await draw($, 84, 24)
  const outside = lines(cells, 84).join('').replace(/[╭╮╰╯│─━]|[●a-z./ ]/g, '') // boxes, names and the root folder's frame
  expect(outside).toBe('')
})
