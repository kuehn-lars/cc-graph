import { expect, test } from 'claude-code/testing'
import { mount, start, ui } from './kit'

// Derived: no session writes six notes, so the state is seeded.
const seedNotes = (on: any, ...notes: string[]) =>
  on('state.get', async (_$: any, e: any, next: any) => (e.key === 'notes' ? ({ value: { value: notes, version: 0 } } as any) : next(e)))
const texts = async (pane: any, text: RegExp) => (await pane.findAll({ type: 'Text', text })).map((t: any) => t.text)

test('F08-R5 the footer shows the newest five notes, one line each', async ($, on) => {
  ui(on)
  seedNotes(on, 'note 1', 'note 2', 'note 3', 'note 4', 'note 5', '3 files over the cap of 20')
  await start($)
  const pane = await mount($, 'terminal')
  expect(await texts(pane, /^note|cap of/)).toEqual(['note 2', 'note 3', 'note 4', 'note 5', '3 files over the cap of 20'])
})

test('F14-AC8 without notes the footer draws nothing', async ($, on) => {
  ui(on)
  await start($)
  const pane = await mount($, 'terminal')
  expect(await texts(pane, /cap of|note/)).toEqual([])
})

test('F14-AC8 the footer says how many files the graph holds over the cap', async ($, on) => {
  ui(on)
  seedNotes(on, '3 files over the cap of 20')
  await start($)
  const pane = await mount($, 'terminal')
  expect(await texts(pane, /cap of/)).toEqual(['3 files over the cap of 20'])
})
