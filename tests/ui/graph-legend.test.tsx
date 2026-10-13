import { expect, test } from 'claude-code/testing'
import { replay } from '../events/kit'
import { decode, mount, node, start, ui, viewLaidOut } from './kit'

const COLUMNS = 64
const ROWS = 25 // a 30-row pane less the view keys, the meter line, the now line and two legend lines
const note = (path: string) => ({ path, type: 'Project', tokens: 10, reason: null })
// The two legend lines: the Texts made of other Texts that start with a shape's mark, "rings" or "memory".
const legend = async (pane: any): Promise<string[]> =>
  (await pane.findAll({ type: 'Text', text: /^([●◐◌○!⋯◆]|changes|memory)/ })).filter((t: any) => t.children.some((c: any) => typeof c !== 'string')).map((t: any) => t.text)

test('F09-R28 memory files are not drawn on the graph', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1)], [], { 'a.ts': { x: 0, y: 63 } }, [note('src/auth/CLAUDE.md'), note('CLAUDE.md')])
  await start($)
  const cells = decode(await (await mount($, 'terminal', COLUMNS, 30)).find({ type: 'Raster' }))
  expect(cells.filter(c => c.char === '■')).toHaveLength(0)
  expect(cells).toHaveLength(COLUMNS * ROWS)
})

test('F09-AC35 after step 8 the legend names the glyphs, then the changes and the memory files, and nothing that is not on screen', async ($, on) => {
  ui(on)
  const values: Record<string, unknown> = { view: 'graph', memory: [note('src/auth/CLAUDE.md'), note('CLAUDE.md')] } // the replay writes the rest
  on('state.get', async (_$, e: any, next) => (e.key in values ? ({ value: { value: values[e.key], version: 0 } } as any) : next(e)))
  await replay($, on, 8)
  const lines = await legend(await mount($, 'terminal', 100, 30))
  expect(lines).toEqual(['● in context  ◐ partly read  ◌ search hits only  ━ size', 'changes  edited · created  memory  CLAUDE.md · src/auth/CLAUDE.md'])
  for (const s of ['○', '!', '⋯', '◆', 'changed ']) expect(lines.join()).not.toContain(s)
})

test('F09-R28 the legend names a ghost and a change only while one is drawn, each in its colour', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1, { state: 'ghost' }), node('b.ts', 2, { change: 'external' })], [], {})
  await start($)
  const pane = await mount($, 'terminal', 100, 30)
  expect(await legend(pane)).toEqual(['● in context  ⋯ never opened  ━ size', 'changes  changed'])
  expect((await pane.find({ type: 'Text', text: /^changed$/ }))?.props.color).toBe('inactive')
  expect((await pane.find({ type: 'Text', text: /^⋯$/ }))?.props.color).toBe('inactive')
})

test('F09-R28 a legend line wider than bodyColumns is cut and closed by "…"', async ($, on) => {
  ui(on)
  viewLaidOut(on, [node('a.ts', 1, { change: 'edited' }), node('b.ts', 2, { change: 'created' })], [], {})
  await start($)
  const [first, second] = await legend(await mount($, 'terminal', 10, 30))
  expect([...first!]).toHaveLength(10)
  expect(first!.endsWith('…')).toBe(true)
  expect(second!.endsWith('…')).toBe(true)
})
