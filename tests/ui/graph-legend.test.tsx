import { expect, test } from 'claude-code/testing'
import { replay } from '../events/kit'
import { decode, mount, node, start, ui, viewLaidOut } from './kit'

const COLUMNS = 64
const ROWS = 27 // a 30-row pane less the view keys, the meter line and the legend
const note = (path: string) => ({ path, type: 'Project', tokens: 10, reason: null })
// The dim Text: these tests have no footer notes.
const legend = async (pane: any): Promise<string> => (await pane.findAll({ type: 'Text' })).find((t: any) => t.props.dimColor)?.text ?? ''

test('F09-R5 a changed node paints its cell\'s background in its ring colour', async ($, on) => {
  ui(on)
  viewLaidOut(on, [
    node('a.ts', 1, { change: 'edited' }), node('b.ts', 2, { change: 'created' }), node('c.ts', 3, { change: 'external' }), node('d.ts', 4, { change: 'blind' }), node('e.ts', 5),
  ], [], { 'a.ts': { x: 10, y: 10 }, 'b.ts': { x: 30, y: 10 }, 'c.ts': { x: 50, y: 10 }, 'd.ts': { x: 70, y: 10 }, 'e.ts': { x: 90, y: 10 } })
  await start($)
  const cells = decode(await (await mount($, 'terminal', COLUMNS, 30)).find({ type: 'Raster' })).filter(c => c.char === '●')
  expect(cells.map(c => c.bg)).toEqual([0xd29922, 0x3fb950, 0x8b949e, 0xf85149, 0x01000000]) // amber, green, grey, red; no change keeps the terminal's own
})

test('F09-R5 memory files are ■ cells along the bottom-left of the raster, in path order, and a node moves off them', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1)], [], { 'a.ts': { x: 0, y: 63 } }, [note('src/auth/CLAUDE.md'), note('CLAUDE.md')])
  await start($)
  const cells = decode(await (await mount($, 'terminal', COLUMNS, 30)).find({ type: 'Raster' }))
  expect(cells.slice((ROWS - 1) * COLUMNS, (ROWS - 1) * COLUMNS + 3).map(c => c.char)).toEqual(['■', '■', '●']) // the node would sit at the first cell; it takes the next free one
  expect(cells.filter(c => c.char === '■')).toHaveLength(2)
})

test('F09-AC8 after step 8 the legend names ●, ◐, ◌, ■ and the amber and green rings, and nothing that is not on screen', async ($, on) => {
  ui(on)
  const values: Record<string, unknown> = { view: 'graph', memory: [note('CLAUDE.md')] } // the replay writes the rest
  on('state.get', async (_$, e: any, next) => (e.key in values ? ({ value: { value: values[e.key], version: 0 } } as any) : next(e)))
  await replay($, on, 8)
  const text = await legend(await mount($, 'terminal', 100, 30))
  for (const s of ['●', '◐', '◌', '■', 'amber edited', 'green created']) expect(text).toContain(s)
  for (const s of ['○', '!', '⋯', '◆', 'blind', 'external']) expect(text).not.toContain(s)
})

test('F09-R8 the legend names a ghost and a ring only while one is drawn', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1, { state: 'ghost' }), node('b.ts', 2, { change: 'external' })], [], {})
  await start($)
  const text = await legend(await mount($, 'terminal', 100, 30))
  expect(text).toContain('⋯')
  expect(text).toContain('grey external')
  expect(text).not.toContain('■')
})

test('F09-R8 a legend wider than bodyColumns is cut and closed by "…"', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1, { change: 'edited' }), node('b.ts', 2, { change: 'created' })], [], {})
  await start($)
  const text = await legend(await mount($, 'terminal', 20, 30))
  expect([...text]).toHaveLength(20)
  expect(text.endsWith('…')).toBe(true)
})
