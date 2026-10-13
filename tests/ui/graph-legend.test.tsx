import { expect, test } from 'claude-code/testing'
import { replay } from '../events/kit'
import { decode, mount, node, start, ui, viewLaidOut } from './kit'

const COLUMNS = 64
const ROWS = 26 // a 30-row pane less the view keys, the meter line, the now line and the legend
const note = (path: string) => ({ path, type: 'Project', tokens: 10, reason: null })
// The dim Text: these tests have no footer notes.
const legend = async (pane: any): Promise<string> => (await pane.findAll({ type: 'Text' })).filter((t: any) => t.props.dimColor).at(-1)?.text ?? ''

test('F09-R20 memory files are not drawn on the card', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1)], [], { 'a.ts': { x: 0, y: 63 } }, [note('src/auth/CLAUDE.md'), note('CLAUDE.md')])
  await start($)
  const cells = decode(await (await mount($, 'terminal', COLUMNS, 30)).find({ type: 'Raster' }))
  expect(cells.filter(c => c.char === '■')).toHaveLength(0)
  expect(cells).toHaveLength(COLUMNS * ROWS)
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
