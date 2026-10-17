import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { MemoryNote, ThinkingNote } from '../../types'
import { mount, node, start, ui } from './kit'

// DERIVED: the texts and files of F05-AC8; the shape is the one the mod stores from a recorded step (tests/events/thinking.test.ts).
const notes: ThinkingNote[] = [
  { turn: 1, step: 0, text: 'For step 1, read two files.', chars: 27, files: ['src/config.ts'] },
  { turn: 2, step: 0, text: 'Moving on to step 2.', chars: 20, files: [] },
  { turn: 3, step: 1, text: 'Find the route.', chars: 15, files: ['src/routes/auth.ts'] },
  { turn: 4, step: 0, text: 'Check the limiter.\nThen the route.', chars: 34, files: ['src/auth/login.ts', 'src/middleware/rateLimit.ts'] },
]
const memory: MemoryNote[] = [{ path: 'CLAUDE.md', type: 'Project', tokens: 120, reason: 'at start' }]

/** The test's own `state.get` hook beneath the mod: `thinking`, `memory` and `graph` answer these. */
function seed(on: On, values: Record<string, unknown>) {
  on('state.get', async (_$, e: any, next) => (e.key in values ? ({ value: { value: values[e.key], version: 0 } } as any) : next(e)))
}
const graph = { seq: 1, files: { 'src/auth/login.ts': node('src/auth/login.ts', 1) }, edges: [], decisions: [], compactions: [] }
const texts = async (pane: any) => (await pane.findAll({ type: 'Text' })).map((t: any) => t.text)
const rows = async (pane: any) => (await texts(pane)).filter((t: string) => t.startsWith('turn '))

test('F05-AC8 four notes: the Thinking section, between Memory and Blind spots, shows the newest three, the first "turn 4  Check the limiter.  → login.ts, rateLimit.ts"', async ($, on) => {
  ui(on); seed(on, { thinking: notes, memory, graph })
  await start($)
  const pane = await mount($, 'terminal', 64)
  expect(await rows(pane)).toEqual([
    'turn 4  Check the limiter.  → login.ts, rateLimit.ts',
    'turn 3  Find the route.  → auth.ts',
    'turn 2  Moving on to step 2.',
  ])
  const all = await texts(pane)
  const at = (t: string) => all.findIndex((x: string) => x.startsWith(t))
  expect(at('Memory')).toBeLessThan(at('Thinking'))
  expect(at('Thinking')).toBeLessThan(at('turn 4'))
  expect(at('turn 2')).toBeLessThan(at('Blind spots'))
})

test('F05-AC8 at 30 columns the rows are cut at the pane edge and closed by "…"', async ($, on) => {
  ui(on); seed(on, { thinking: notes })
  await start($)
  expect(await rows(await mount($, 'terminal', 30))).toEqual([
    'turn 4  Check the limiter.  →…',
    'turn 3  Find the route.  → au…',
    'turn 2  Moving on to step 2.',
  ])
})

test('F05-AC8 at 120 columns the rows stay whole', async ($, on) => {
  ui(on); seed(on, { thinking: notes })
  await start($)
  expect(await rows(await mount($, 'terminal', 120))).toEqual([
    'turn 4  Check the limiter.  → login.ts, rateLimit.ts',
    'turn 3  Find the route.  → auth.ts',
    'turn 2  Moving on to step 2.',
  ])
})

test('F05-R8 / F08-R7 with no note, the section says "No thinking captured yet."', async ($, on) => {
  ui(on)
  await start($)
  const all = await texts(await mount($, 'terminal'))
  expect(all).toContain('Thinking')
  expect(all).toContain('No thinking captured yet.')
})

test('F05-AC12 with captureThinking: false, the list draws no Thinking heading and no "No thinking captured yet."', { options: { captureThinking: false } }, async ($, on) => {
  ui(on); seed(on, { thinking: notes })
  await start($)
  const all = await texts(await mount($, 'terminal'))
  expect(all.filter((t: string) => /^Thinking|No thinking captured yet|^turn /.test(t))).toEqual([])
})
