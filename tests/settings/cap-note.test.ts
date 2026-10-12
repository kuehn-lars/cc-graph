import manyChanges from '../../fixtures/sessions/many-changes'
import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import { graphOf, observe, written } from '../events/kit'

// Replays every recorded process of the many-changes session: 24 new files, one Write each.
async function replay($: any, on: any) {
  const answer = { ref: 0, result: null as any, text: '' }
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  on('command.register', (_$: any, e: any) => ({ value: { command: e.name } }))
  on('turn.start', (_$: any, e: any) => ({ turnId: e.turnId }))
  on('tool.call', () => answer)
  observe(on)
  for (const row of manyChanges.events) {
    if (row.event === 'session.start') await $.session.start(row.input)
    else if (row.event === 'turn.start') await $.turn.start(row.input)
    else (Object.assign(answer, row.result), await $.tool.call(row.input))
  }
}

test('F14-AC8 a cap of 20 keeps all 24 changed files and the footer note says 4 are over', { options: { maxNodes: 20 } }, async ($, on) => {
  await replay($, on)
  expect(Object.values((await graphOf())!.files).filter(n => n.change)).toHaveLength(24)
  expect(written.notes).toEqual(['4 files over the cap of 20'])
})

test('F14-AC8 at the default cap the same session leaves no note', async ($, on) => {
  await replay($, on)
  expect(written.notes).toBeUndefined()
})

// Derived: the notes of an earlier write, seeded; no recording holds a second cap note.
const staleNotes = (on: On) =>
  on('state.get', async (_$, e: any, next) => (e.key === 'notes' ? ({ value: { value: ['blind spots need git', '2 files over the cap of 20'], version: 0 } } as any) : next(e)))

test('F14-AC8 the cap note is replaced by the new count and another note stays', { options: { maxNodes: 20 } }, async ($, on) => {
  staleNotes(on)
  await replay($, on)
  expect(written.notes).toEqual(['blind spots need git', '4 files over the cap of 20'])
})

test('F14-AC8 the cap note goes once the graph is under the cap', async ($, on) => {
  staleNotes(on)
  await replay($, on)
  expect(written.notes).toEqual(['blind spots need git'])
})
