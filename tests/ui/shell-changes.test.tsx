import { expect, test } from 'claude-code/testing'
import { boxOf, decode, mount, node, seed, start, ui, viewLaidOut } from './kit'

// F07-R17: a file a command created has no counted lines, so neither view says "+0".
const util = node('src/util.ts', 1, { state: 'partial', change: 'created', added: 0, seen: 'only what the command changed' })

test('F07-AC31 the list shows a file a command created as "created", without "+0"', async ($, on) => {
  ui(on); seed(on, util)
  await start($)
  const [text] = (await (await mount($, 'terminal')).findAll({ type: 'Text', text: /^[●◐◌○!⋯] / })).map((r: any) => r.text)
  expect(text).toContain('util.ts  created  ')
  expect(text).not.toContain('+0')
})

test('F07-R17 the graph shows a file a command created as "new", without "+0"', async ($, on) => {
  ui(on)
  viewLaidOut(on, [util], [], { 'src/util.ts': { x: 50, y: 30 } })
  await start($)
  const cells = decode(await (await mount($, 'terminal', 84, 30)).find({ type: 'Raster' }))
  expect(boxOf(cells, 84, 'util.ts')!.rows[1]).toBe('│ ◐ util.ts  new │')
})
