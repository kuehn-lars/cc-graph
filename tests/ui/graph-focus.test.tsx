import { expect, test } from 'claude-code/testing'
import { replay } from '../events/kit'
import { boxOf, decode, lines, mount, node, start, ui, viewGraph, viewLaidOut } from './kit'

const COLUMNS = 100
const CLAUDE = 0xd77757, SUBTLE = 0x505050
const now = async (pane: any): Promise<string | undefined> => (await pane.find({ type: 'Text', text: /^(⏺ now|⏺ selected|Nothing read yet\.)/ }))?.text

// login.test.ts touched last, importing login.ts and helpers.ts; login.ts imports password.ts.
const chain = (selected: string | null = null) => ({
  nodes: [
    node('test/login.test.ts', 4, { tokens: null }),
    node('src/auth/login.ts', 3, { state: 'compacted', tokens: null }),
    node('src/auth/password.ts', 2, { state: 'compacted', tokens: null }),
    node('test/helpers.ts', 1, { state: 'compacted', tokens: null }),
  ],
  edges: [['test/login.test.ts', 'src/auth/login.ts'], ['test/login.test.ts', 'test/helpers.ts'], ['src/auth/login.ts', 'src/auth/password.ts']] as [string, string][],
  layout: { 'test/login.test.ts': { x: 50, y: 10 }, 'src/auth/login.ts': { x: 25, y: 32 }, 'src/auth/password.ts': { x: 25, y: 54 }, 'test/helpers.ts': { x: 75, y: 32 } },
  selected,
})

async function draw($: any, on: any, selected: string | null = null) {
  const c = chain(selected)
  ui(on)
  viewLaidOut(on, c.nodes, c.edges, c.layout, [], c.selected)
  await start($)
  return decode(await (await mount($, 'terminal', COLUMNS, 40)).find({ type: 'Raster' }))
}

/** The colour of the line cell over the `┴` where an edge enters a box's top side. */
const entry = (cells: ReturnType<typeof decode>, box: NonNullable<ReturnType<typeof boxOf>>) => cells[(box.top - 1) * COLUMNS + box.left + box.rows[0]!.indexOf('┴')]!.fg

test('F09-AC34 the node touched last has its border and edges in Claude\'s colour; other edges recede', async ($, on) => {
  const cells = await draw($, on)
  const [top, login, password] = ['login.test.ts', 'login.ts', 'password.ts'].map(n => boxOf(cells, COLUMNS, n)!)
  expect(top!.cell(0, 0).fg).toBe(CLAUDE)
  expect(entry(cells, login!)).toBe(CLAUDE)
  expect(entry(cells, password!)).toBe(SUBTLE)
})

test('F09-AC34 a selected node is the focus instead: its border is Claude\'s colour, the node touched last\'s is not', async ($, on) => {
  const cells = await draw($, on, 'src/auth/password.ts')
  const [top, login, password] = ['login.test.ts', 'login.ts', 'password.ts'].map(n => boxOf(cells, COLUMNS, n)!)
  expect(password!.cell(0, 0).fg).toBe(CLAUDE)
  expect(top!.cell(0, 0).fg).not.toBe(CLAUDE)
  expect(entry(cells, password!)).toBe(CLAUDE)
})

test('F09-R24 a selection that is no longer in the graph leaves the focus on the node touched last', async ($, on) => {
  const cells = await draw($, on, 'gone.ts')
  expect(boxOf(cells, COLUMNS, 'login.test.ts')!.cell(0, 0).fg).toBe(CLAUDE)
})

test('F09-R26 the edges of one node leave it together: login.test.ts has one exit', async ($, on) => {
  const cells = await draw($, on)
  const top = boxOf(cells, COLUMNS, 'login.test.ts')!
  expect(lines(cells, COLUMNS)[top.bottom]!.split('┬')).toHaveLength(2)
})

test('F09-AC21 after step 2 the now line reads "⏺ now  src/auth/login.ts  · 49 lines · imports 2"', async ($, on) => {
  ui(on)
  viewGraph(on)
  await replay($, on, 2)
  expect(await now(await mount($, 'terminal'))).toBe('⏺ now  src/auth/login.ts  · 49 lines · imports 2')
})

test('F09-AC21 on an empty graph the now line reads "Nothing read yet."', async ($, on) => {
  ui(on)
  viewGraph(on)
  await start($)
  expect(await now(await mount($, 'terminal'))).toBe('Nothing read yet.')
})

test('F09-R18 the now line carries the change word, then what Claude saw, then the list words', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/auth/login.ts', 2, { change: 'edited', added: 2 }), node('src/auth/password.ts', 1, { state: 'ghost' })], [['src/auth/login.ts', 'src/auth/password.ts']], {})
  await start($)
  const pane = await mount($, 'terminal', 100, 30)
  expect(await now(pane)).toBe('⏺ now  src/auth/login.ts  +2 −0  · 10 lines · imports 1')
  expect((await pane.find({ type: 'Text', text: /^\+2$/ }))?.props.color).toBe('success') // as a diff colours them
  expect((await pane.find({ type: 'Text', text: /^−0$/ }))?.props.color).toBe('error')
})

test('F09-R18 the now node is never a ghost', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('b.ts', 2, { state: 'ghost' }), node('a.ts', 1)], [], {})
  await start($)
  expect(await now(await mount($, 'terminal', 100, 30))).toBe('⏺ now  a.ts  · 10 lines')
})

test('F09-R18 a path wider than the pane is cut from its start and led by "…"', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/some/deep/folder/login.ts', 1)], [], {})
  await start($)
  const text = (await now(await mount($, 'terminal', 24, 30)))!
  expect([...text].length).toBeLessThanOrEqual(24)
  expect(text).toMatch(/^⏺ now {2}….*login\.ts$/)
})

test('F09-AC4 the Raster gives up a row to the now line', async ($, on) => {
  ui(on)
  viewGraph(on, [], node('src/a.ts', 1))
  await start($)
  const raster = await (await mount($, 'terminal', 64, 30)).find({ type: 'Raster' })
  expect(raster?.props.rows).toBe(25) // 30 rows less the view keys, the meter line, the now line and two legend lines
})

test('F09-AC45 the now line carries the reason and what Claude saw: "changed by `npm install left-pad` · never read"', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('package.json', 2, { state: 'unread', change: 'blind', reason: 'changed by `npm install left-pad`', seen: 'never read', tokens: null }), node('a.ts', 1)], [], {})
  await start($)
  expect(await now(await mount($, 'terminal', 120, 30))).toBe('⏺ now  package.json  changed unseen  · changed by `npm install left-pad` · never read')
})

test('F09-AC45 a selected node is named instead, "⏺ selected", with its lines seen', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('src/api/users.ts', 1, { state: 'partial', seen: 'first 10 lines' }), node('src/db/redis.ts', 2)], [], {}, [], 'src/api/users.ts')
  await start($)
  expect(await now(await mount($, 'terminal', 120, 30))).toBe('⏺ selected  src/api/users.ts  · first 10 lines')
})

const deletedInWorktree = (on: any) => viewLaidOut(on, [node('src/a.ts', 2, { change: 'deleted', reason: 'deleted by `rm src/a.ts` in worktree agent-a1' }), node('src/b.ts', 1, { state: 'ghost' })], [['src/a.ts', 'src/b.ts']], {})

for (const [columns, line] of [
  [120, '⏺ now  src/a.ts  deleted  · deleted by `rm src/a.ts` in worktree agent-a1 · 10 lines · imports 1'],
  [80, '⏺ now  src/a.ts  deleted  · deleted by `rm src/a.ts` in worktree agent-a1'],
] as const)
  test(`F09-R18 what does not fit leaves from the end, the list words first, then what Claude saw: ${columns} columns`, async ($, on) => {
    ui(on); deletedInWorktree(on)
    await start($)
    expect(await now(await mount($, 'terminal', columns, 30))).toBe(line)
  })


test('F09-AC46 a long reason keeps its worktree ending and cuts its command with "…"', async ($, on) => {
  ui(on)
  const reason = 'deleted by `rm src/routes/index.ts && test -e src/routes/index.ts && echo GONE` in worktree agent-acf6cc8b99268ed6a'
  viewLaidOut(on, [node('src/routes/index.ts', 1, { state: 'unread', change: 'deleted', reason, seen: 'never read', tokens: null })], [], {})
  await start($)
  const line = (await now(await mount($, 'terminal', 100, 30)))!
  expect([...line].length).toBeLessThanOrEqual(100)
  expect(line).toMatch(/^⏺ now {2}src\/routes\/index\.ts {2}deleted {2}· deleted by `rm src\/.*…` in worktree agent-acf6cc8b99268ed6a$/)
})
