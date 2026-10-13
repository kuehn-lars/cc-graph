import { expect, test } from 'claude-code/testing'
import { replay } from '../events/kit'
import { decode, mount, node, start, ui, viewGraph } from './kit'

const texts = async (pane: any, text: RegExp) => (await pane.findAll({ type: 'Text', text })).map((t: any) => t.text)

test('F09-AC4 the mounted Raster decodes to exactly columns × rows cells', async ($, on) => {
  ui(on)
  viewGraph(on, [], node('src/a.ts', 1), node('src/b/c.ts', 2, { state: 'partial' }), node('d.ts', 3, { state: 'search' }))
  await start($)
  const raster = await (await mount($, 'terminal', 64, 30)).find({ type: 'Raster' })
  expect(raster?.key).toBe('graph')
  expect([raster?.props.columns, raster?.props.rows]).toEqual([64, 28]) // 30 rows less the view keys and the meter line
  expect(decode(raster)).toHaveLength(64 * 28)
})

test('F09-AC4 the Raster gives up a row to each footer note and is capped at 512 by 256', async ($, on) => {
  ui(on)
  viewGraph(on, ['one', 'two'])
  await start($)
  const raster = await (await mount($, 'terminal', 40, 30)).find({ type: 'Raster' })
  expect([raster?.props.columns, raster?.props.rows]).toEqual([40, 26])
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

test('F09-AC4 after the reference session\'s step 3 the cells hold ◐, ● and ◌', async ($, on) => {
  ui(on)
  viewGraph(on)
  await replay($, on, 3)
  const cells = decode(await (await mount($, 'terminal')).find({ type: 'Raster' }))
  const glyphs = cells.map(c => c.char).filter(c => c !== ' ')
  expect(glyphs).toContain('◐')
  expect(glyphs).toContain('●')
  expect(glyphs).toContain('◌')
})

test('F09-AC7 with 8 rows left for the graph, the graph is drawn', async ($, on) => {
  ui(on)
  viewGraph(on)
  await start($)
  const pane = await mount($, 'terminal', 64, 10)
  expect((await pane.find({ type: 'Raster' }))?.props.rows).toBe(8)
  expect(await texts(pane, /taller pane/)).toEqual([])
})
