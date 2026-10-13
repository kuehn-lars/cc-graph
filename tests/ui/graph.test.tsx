import { expect, test } from 'claude-code/testing'
import { replay } from '../events/kit'
import { decode, dots, mount, node, start, ui, viewGraph } from './kit'

const texts = async (pane: any, text: RegExp) => (await pane.findAll({ type: 'Text', text })).map((t: any) => t.text)

test('F09-AC4 the mounted Raster decodes to exactly columns × rows cells', async ($, on) => {
  ui(on)
  viewGraph(on, [], node('src/a.ts', 1), node('src/b/c.ts', 2, { state: 'partial' }), node('d.ts', 3, { state: 'search' }))
  await start($)
  const raster = await (await mount($, 'terminal', 64, 30)).find({ type: 'Raster' })
  expect(raster?.key).toBe('graph')
  expect([raster?.props.columns, raster?.props.rows]).toEqual([64, 25]) // 30 rows less the view keys, the meter line, the now line and two legend lines
  expect(decode(raster)).toHaveLength(64 * 25)
})

test('F09-AC4 the Raster gives up a row to each footer note', async ($, on) => {
  ui(on)
  viewGraph(on, ['one', 'two'])
  await start($)
  const raster = await (await mount($, 'terminal', 40, 30)).find({ type: 'Raster' })
  expect([raster?.props.columns, raster?.props.rows]).toEqual([40, 23])
})

test('F09-AC4 the Raster is capped at 512 by 256', async ($, on) => {
  ui(on)
  viewGraph(on)
  await start($)
  const raster = await (await mount($, 'terminal', 600, 400)).find({ type: 'Raster' })
  expect([raster?.props.columns, raster?.props.rows]).toEqual([512, 256])
})

test('F09-AC5 on desktop with view: graph, no Raster is drawn and the list is', async ($, on) => {
  ui(on, { isPlaced: true }, ['desktop'])
  viewGraph(on)
  await start($)
  const pane = await mount($, 'desktop')
  expect(await pane.find({ type: 'Raster' })).toBeUndefined()
  expect((await pane.find({ type: 'Text', text: 'Files' }))?.type).toBe('Text')
})

test('F09-AC7 with 6 rows left for the graph, the list is drawn and the footer says "Graph needs a taller pane"', async ($, on) => {
  ui(on)
  viewGraph(on)
  await start($)
  const pane = await mount($, 'terminal', 64, 8)
  expect(await pane.find({ type: 'Raster' })).toBeUndefined()
  expect((await pane.find({ type: 'Text', text: 'Files' }))?.type).toBe('Text')
  expect(await texts(pane, /taller pane/)).toEqual(['Graph needs a taller pane'])
})

test('F09-AC4 after the reference session\'s step 3 the card holds in-context shapes and none of the list glyphs ◐ ● ◌ (nodes without a layout overlap, so the search shape is tested in graph-card)', async ($, on) => {
  ui(on)
  viewGraph(on)
  await replay($, on, 3)
  const cells = decode(await (await mount($, 'terminal')).find({ type: 'Raster' }))
  const colors = new Set(dots(cells, 64).values())
  expect(colors).toContain(0x7aa7ff) // in context: ● and ◐
  expect(cells.filter(c => '◐●◌'.includes(c.char))).toHaveLength(0)
})

test('F09-AC7 with 8 rows left for the graph, the graph is drawn', async ($, on) => {
  ui(on)
  viewGraph(on)
  await start($)
  const pane = await mount($, 'terminal', 64, 13)
  expect((await pane.find({ type: 'Raster' }))?.props.rows).toBe(8)
  expect(await texts(pane, /taller pane/)).toEqual([])
})

test('F09-AC4 more files than cells still draw columns × rows cells', async ($, on) => {
  ui(on)
  viewGraph(on, [], ...Array.from({ length: 12 }, (_, i) => node(`src/f${i}.ts`, i + 1)))
  await start($)
  const raster = await (await mount($, 'terminal', 1, 13)).find({ type: 'Raster' }) // 1 × 8 cells
  expect(decode(raster)).toHaveLength(8)
})
