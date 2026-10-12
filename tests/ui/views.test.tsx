import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import { PANE_ID, paneProps, run, ui } from './kit'

const SURFACES = ['terminal', 'desktop', 'vscode', 'mobile'] as const
const start = ($: any) => $.session.start({ cwd: '/w', surface: null, isInteractive: false })
const mount = ($: any, surface: any) =>
  $.ui.mount({ plugin: 'cc-graph', surface, component: 'Pane', requestId: PANE_ID, props: paneProps() })

/** What the mod wrote to `view` (the test `$` has no `state` noun). */
function viewState(on: On) {
  const seen = { written: [] as any[] }
  on('state.set', (_$, e: any, next) => (e.key === 'view' && seen.written.push(e.value), next(e)))
  return seen
}

test('F08-AC4 pressing l then g switches view, and the choice survives a second session.start', async ($, on) => {
  ui(on)
  const seen = viewState(on)
  await start($)
  const pane = await mount($, 'terminal')
  // Press by hotkey: find the Button that carries 'l' (then 'g'), so a wrong hotkey fails.
  for (const hotkey of ['l', 'g']) {
    const button = (await pane.findAll({ type: 'Button' })).find((b: any) => b.props.hotkey === hotkey)
    await pane.press({ key: button.key })
  }
  expect(seen.written).toEqual(['list', 'graph'])
  await start($)
  await run($)
  // The host keeps `view`; a second session.start and a bare /graph write nothing over it.
  expect(seen.written).toEqual(['list', 'graph'])
  expect((await pane.find({ type: 'Text', text: 'Nothing read yet.' }))?.type).toBe('Text')
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

for (const surface of SURFACES) {
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
  const seen = viewState(on)
  await start($)
  await run($, 'graph')
  await run($, 'list')
  await run($, 'nonsense')
  await run($)
  expect(seen.written).toEqual(['graph', 'list'])
})
