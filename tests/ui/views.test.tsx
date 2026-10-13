import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import { SURFACES, mount, run, start, ui, writes } from './kit'

/** The values the mod wrote to `view`. */
const views = (seen: ReturnType<typeof writes>) => seen.filter(w => w.key === 'view').map(w => w.value)

test('F08-AC4 pressing l then g switches view, and the choice survives a second session.start', async ($, on) => {
  ui(on)
  const seen = writes(on)
  await start($)
  const pane = await mount($, 'terminal')
  // Press by hotkey: find the Button that carries 'l' (then 'g'), so a wrong hotkey fails.
  for (const hotkey of ['l', 'g']) {
    const button = (await pane.findAll({ type: 'Button' })).find((b: any) => b.props.hotkey === hotkey)
    await pane.press({ key: button.key })
  }
  expect(views(seen)).toEqual(['list', 'graph'])
  await start($)
  await run($)
  // The host keeps `view`; a second session.start and a bare /graph write nothing over it.
  expect(views(seen)).toEqual(['list', 'graph'])
  expect((await pane.find({ type: 'Raster' }))?.key).toBe('graph') // the terminal draws the graph now (F09)
})

test('NFR-A2 l and g are Buttons', async ($, on) => {
  ui(on)
  await start($)
  const pane = await mount($, 'terminal')
  expect((await pane.find({ key: 'view-list' }))?.props.hotkey).toBe('l')
  expect((await pane.find({ key: 'view-graph' }))?.props.hotkey).toBe('g')
  expect((await pane.find({ key: 'view-list' }))?.type).toBe('Button')
  expect((await pane.find({ key: 'view-graph' }))?.type).toBe('Button')
})

for (const surface of SURFACES.filter(s => s !== 'terminal')) {
  test(`F08-AC5 / NFR-C2 with view: graph the list is drawn on ${surface}`, async ($, on) => {
    ui(on)
    on('state.get', (_$, e: any, next) => (e.key === 'view' ? ({ value: { value: 'graph', version: 0 } } as any) : next(e)))
    await start($)
    const pane = await mount($, surface)
    expect((await pane.find({ type: 'Text', text: 'Files' }))?.type).toBe('Text')
    expect((await pane.find({ type: 'Text', text: 'Nothing read yet.' }))?.type).toBe('Text')
  })
}

test('F08-R2 /graph list and /graph graph set view; any other argument leaves it', async ($, on) => {
  ui(on)
  const seen = writes(on)
  await start($)
  await run($, 'graph')
  await run($, 'list')
  await run($, 'nonsense')
  await run($)
  expect(views(seen)).toEqual(['graph', 'list'])
})

test('F08-R2 /graph list sets view even when no surface is attached, and still answers in text', async ($, on) => {
  const { opened } = ui(on, undefined, [])
  const seen = writes(on)
  await start($)
  const out = await run($, 'list')
  expect(views(seen)).toEqual(['list'])
  expect(opened).toEqual([])
  expect(out.text).toBe('≈0 in 0 files · window –\nNothing read yet.')
})

test('F08-R9 the l and g buttons are drawn apart, not run together', async ($, on) => {
  ui(on)
  await start($)
  const pane = await mount($, 'terminal')
  const row = (await pane.findAll({ type: 'Box' })).find((b: any) => b.props.gap >= 1)
  expect(row).toBeDefined()
})
