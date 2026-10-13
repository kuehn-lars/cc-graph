import { expect, test } from 'claude-code/testing'
import { boxOf, decode, lines, mount, node, start, ui, viewLaidOut } from './kit'

const CLAUDE = 0xd77757, SUBTLE = 0x505050, INACTIVE = 0x999999, DELETED = 0xff6b80

const draw = async ($: any, columns: number, rows: number) => {
  await start($)
  return decode(await (await mount($, 'terminal', columns, rows + 5)).find({ type: 'Raster' })) // the pane gives 5 rows to the view keys, the meter line, the now line and two legend lines
}

/** The frame titled `title`: where it sits, and its top-left corner and title's first letter. */
function frameOf(cells: ReturnType<typeof decode>, columns: number, title: string) {
  const rows = lines(cells, columns)
  const top = rows.findIndex(r => r.includes(`╭─ ${title} `))
  if (top < 0) return undefined
  const left = rows[top]!.indexOf(`╭─ ${title} `)
  let right = left + 1, bottom = top + 1
  while (rows[top]![right] !== '╮') right++
  while (!'╰├'.includes(rows[bottom]![left]!)) bottom++
  return { left, right, top, bottom, corner: cells[top * columns + left]!, letter: cells[top * columns + left + 3]! }
}
const inside = (b: { left: number; right: number; top: number; bottom: number }, f: { left: number; right: number; top: number; bottom: number }) =>
  b.left > f.left && b.right < f.right && b.top > f.top && b.bottom < f.bottom

test('F09-AC38 each folder is a frame titled with its path around its boxes, the importing folder above', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/routes/index.ts', 3), node('src/auth/login.ts', 2), node('src/auth/sessions.ts', 1)], [['src/routes/index.ts', 'src/auth/login.ts']], {})
  const cells = await draw($, 100, 30)
  const [routes, auth] = [frameOf(cells, 100, 'src/routes/')!, frameOf(cells, 100, 'src/auth/')!]
  expect(inside(boxOf(cells, 100, 'index.ts')!, routes)).toBe(true)
  for (const name of ['login.ts', 'sessions.ts']) expect(inside(boxOf(cells, 100, name)!, auth)).toBe(true)
  expect([routes.corner.fg, auth.corner.fg, routes.letter.fg, auth.letter.fg]).toEqual([SUBTLE, SUBTLE, INACTIVE, INACTIVE])
  expect(routes.bottom).toBeLessThan(auth.top)
})

test('F09-AC39 inside a folder an importer sits above what it imports', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/auth/login.ts', 2), node('src/auth/sessions.ts', 1)], [['src/auth/login.ts', 'src/auth/sessions.ts']], {})
  const cells = await draw($, 100, 30)
  const [login, sessions, auth] = [boxOf(cells, 100, 'login.ts')!, boxOf(cells, 100, 'sessions.ts')!, frameOf(cells, 100, 'src/auth/')!]
  expect(login.bottom).toBeLessThan(sessions.top)
  expect(inside(login, auth) && inside(sessions, auth)).toBe(true)
})

test('F09-AC40 a folder with no import either way takes free room at the top right of the graph', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('README.md', 3), node('src/a.ts', 2), node('src/b/c.ts', 1)], [['src/a.ts', 'src/b/c.ts']], {})
  const cells = await draw($, 120, 30)
  const [root, src, b] = [frameOf(cells, 120, './')!, frameOf(cells, 120, 'src/')!, frameOf(cells, 120, 'src/b/')!]
  expect(root.top).toBe(Math.min(src.top, b.top)) // level with the top of the graph
  expect(root.left).toBeGreaterThan(Math.max(src.right, b.right))
})

test('F09-AC41 a deleted file is a box with its border and change word in the deleted colour, its name inactive', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/a.ts', 2), node('src/db/redis.ts', 1, { change: 'deleted' })], [], {})
  const box = boxOf(await draw($, 84, 24), 84, 'redis.ts')!
  expect(box.rows[1]).toBe('│ ● redis.ts  deleted │')
  expect([box.cell(0, 0).fg, box.cell(14, 1).fg, box.cell(4, 1).fg]).toEqual([DELETED, DELETED, INACTIVE])
})

test('F09-AC42 the now node drawn as a tag has its name in Claude\'s colour', async ($, on) => {
  ui(on)
  const nodes = Array.from({ length: 12 }, (_, i) => node(`f${String(i).padStart(2, '0')}.ts`, i + 1))
  viewLaidOut(on, nodes, [], {})
  const tag = boxOf(await draw($, 64, 8), 64, 'f11.ts')!
  expect(tag.boxed).toBe(false)
  expect([tag.cell(2, 0).fg, tag.cell(0, 0).fg]).toEqual([CLAUDE, 0xb1b9f9]) // the name; the glyph keeps its state's colour
})

test('F09-AC43 the legend explains the size bar and names deleted files', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 3), node('b.ts', 2, { change: 'edited' }), node('c.ts', 1, { change: 'deleted' })], [], {})
  await start($)
  const pane = await mount($, 'terminal', 100, 30)
  const legend = (await pane.findAll({ type: 'Text', text: /^(●|changes)/ })).filter((t: any) => t.children.some((c: any) => typeof c !== 'string')).map((t: any) => t.text)
  expect(legend).toEqual(['● in context  ━ size', 'changes  edited · deleted'])
  expect((await pane.find({ type: 'Text', text: /^━$/ }))?.props.color).toBe('suggestion')
  expect((await pane.find({ type: 'Text', text: /^deleted$/ }))?.props.color).toBe('error')
})
