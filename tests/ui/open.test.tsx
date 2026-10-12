import { expect, test } from 'claude-code/testing'
import { PANE_ID, SURFACES, paneProps, run, ui } from './kit'

const start = ($: any) => $.session.start({ cwd: '/w', surface: null, isInteractive: false })
const mount = ($: any, surface: any) =>
  $.ui.mount({ plugin: 'cc-graph', surface, component: 'Pane', requestId: PANE_ID, props: paneProps() })

for (const surface of SURFACES) {
  test(`F08-AC1 /graph opens the pane and an empty graph shows "Nothing read yet." on ${surface}`, async ($, on) => {
    const { opened } = ui(on)
    await start($)
    const out = await run($)
    expect(out.text).toBe('CC Graph opened.')
    expect(opened).toHaveLength(1)
    const pane = await mount($, surface)
    expect((await pane.find({ type: 'Text', text: 'Nothing read yet.' }))?.type).toBe('Text')
  })
}

test('F08-R1 /graph is registered at session.start, immediate, with description and hint', async ($, on) => {
  const { registered } = ui(on)
  await start($)
  expect(registered).toEqual([
    { name: 'graph', description: 'Show what Claude read, searched and changed', argumentHint: '[list|graph]', immediate: true },
  ])
})

test('F08-R2 $.ui.open gets the id, title, focus, closeOnEscape and 64 columns', async ($, on) => {
  const { opened } = ui(on)
  await start($)
  await run($)
  expect(opened).toEqual([{ id: 'cc-graph', title: 'CC Graph', focus: true, closeOnEscape: true, columns: 64 }])
})

test('F08-AC7 isPlaced false shows the reason in a toast', async ($, on) => {
  const { toasts } = ui(on, { isPlaced: false, reason: 'needs 144 columns, has 100' })
  await start($)
  await run($)
  expect(toasts).toEqual(['CC Graph is waiting for room: needs 144 columns, has 100'])
})

test('F08-R3 a placed pane shows no toast', async ($, on) => {
  const { toasts } = ui(on)
  await start($)
  await run($)
  expect(toasts).toEqual([])
})

test('NFR-R4 a second plugin draws its own pane beside this one', {
  plugins: [{
    name: 'other',
    register: on => {
      on('ui.render', { component: 'Pane', requestId: 'other' }, ($, e) => {
        const { Text } = $.ui.resolve(e)
        return <Text>Other pane.</Text>
      })
    },
  }],
}, async ($, on) => {
  ui(on)
  await start($)
  for (const surface of SURFACES) {
    const mine = await mount($, surface)
    const other = await $.ui.mount({ plugin: 'other', surface, component: 'Pane', requestId: 'other', props: paneProps() })
    expect((await other.find({ type: 'Text', text: 'Other pane.' }))?.type).toBe('Text')
    expect(await other.find({ type: 'Text', text: 'Nothing read yet.' })).toBeUndefined()
    expect(await mine.find({ type: 'Text', text: 'Other pane.' })).toBeUndefined()
    expect((await mine.find({ type: 'Text', text: 'Nothing read yet.' }))?.type).toBe('Text')
  }
})
