import { expect, test } from 'claude-code/testing'
import { replay } from '../events/kit'
import { decode, mount, node, run, start, ui, viewLaidOut } from './kit'

const rows = async (pane: any): Promise<string[]> => (await pane.findAll({ type: 'Text', text: /^[●◐◌○!⋯] / })).map((r: any) => r.text)

test('F09-AC10 after step 2 login.ts\'s row ends with "imports 2"; password.ts and sessions.ts say "imported by login.ts"', async ($, on) => {
  ui(on)
  await replay($, on, 2)
  const got = await rows(await mount($, 'terminal', 100))
  const row = (p: string) => got.find(r => r.includes(` ${p} `))!
  expect(row('src/auth/login.ts')).toMatch(/imports 2$/)
  expect(row('src/auth/password.ts')).toMatch(/imported by login\.ts$/)
  expect(row('src/auth/sessions.ts')).toMatch(/imported by login\.ts$/)
})

test('F09-R10 a ghost says "imported by" its most recently touched importer, then "+n" for the others', async ($, on) => {
  ui(on, { isPlaced: true }, ['desktop'])
  viewLaidOut(on, [node('g.ts', 1, { state: 'ghost' }), node('a.ts', 2), node('src/b.ts', 4), node('c.ts', 3)], [['a.ts', 'g.ts'], ['src/b.ts', 'g.ts'], ['c.ts', 'g.ts']], {})
  await start($)
  const got = await rows(await mount($, 'desktop', 100))
  expect(got.find(r => r.includes(' g.ts '))).toMatch(/imported by b\.ts \+2$/)
  expect(got.find(r => r.includes(' a.ts '))).toMatch(/imports 1$/)
})

const note = { path: 'CLAUDE.md', type: 'Project', tokens: 10, reason: null }

test('NFR-A3 after step 8 every node, memory file and edge the graph draws has its list row or row word', async ($, on) => {
  ui(on)
  on('state.get', async (_$, e: any, next) => (e.key === 'memory' ? ({ value: { value: [note], version: 0 } } as any) : next(e)))
  await replay($, on, 8)
  await run($, 'graph')
  const graph = await mount($, 'terminal', 100, 40)
  const cells = decode(await graph.find({ type: 'Raster' }))
  await graph.unmount()
  await run($, 'list')
  const pane = await mount($, 'terminal', 100, 40)
  const list = await rows(pane)
  const drawn = (set: string) => cells.filter(c => [...set].includes(c.char)).length
  expect(drawn('●◐◌○!⋯')).toBe(list.length) // every node: one row each
  for (const glyph of '●◐◌') expect(drawn(glyph)).toBe(list.filter(r => r.startsWith(glyph)).length)
  expect(drawn('■')).toBe((await pane.findAll({ type: 'Text', text: /^■ / })).length) // every memory file
  const edges = list.reduce((n, r) => n + Number(/imports (\d+)$/.exec(r)?.[1] ?? 0), 0)
  expect(edges).toBe(6) // routes→login, login→password, sessions, rateLimit, sessions→redis, redis→config
  expect(cells.filter(c => c.char === '▀' || c.char === '▄').length).toBeGreaterThan(0)
})
