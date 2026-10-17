import thinking from '../../fixtures/sessions/thinking'
import { expect, test } from 'claude-code/testing'
import { beneath, observe, writes, written } from '../events/kit'

// The kit refuses an `engine` chunk from the bottom link (the test's), so the recorded step streams without its own.
const step: any = thinking.shown.find((r: any) => r.event === 'turn.step' && !r.input.agentId)!
const chunks = step.chunks.filter((c: any) => c.kind !== 'engine')

/** The recorded session up to its first main-loop step, streamed through the mod: what leaves the hook and what it returns. */
async function streamStep($: any, on: any) {
  beneath(on)
  observe(on)
  on('turn.step', async function* () {
    for (const c of chunks) yield c
    return step.result
  })
  await $.session.start(thinking.shown[0]!.input)
  await $.turn.start(thinking.shown[1]!.input)
  const got: any[] = []
  const stream = $.turn.step(step.input)
  let r = await stream.next()
  for (; !r.done; r = await stream.next()) got.push(r.value)
  return { got, result: r.value }
}

test('F14-AC2 with captureThinking: false, no note is stored and turn.step still passes every chunk', { options: { captureThinking: false } }, async ($, on) => {
  const { got, result } = await streamStep($, on)
  expect(got).toEqual(chunks)
  expect(result).toEqual(step.result)
  expect(writes).not.toContain('thinking')
  expect(written.thinking).toBeUndefined()
})

// The control: the same session with capture on stores the step's note, so the test above sees capture off, not a step that leaves none.
test('F14-AC2 with captureThinking on, the same step stores its note', async ($, on) => {
  await streamStep($, on)
  expect(written.thinking).toMatchObject([{ turn: 1, step: 0, files: ['src/auth/login.ts', 'src/config.ts'] }])
})

// DERIVED: what an activation with capture on left in state, seeded beneath the mod; state outlives the reload a changed option brings.
const HIDDEN = 'Thinking is hidden: turn on showThinkingSummaries to see it.'
const held = [1, 2, 3].map(turn => ({ turn, step: 0, text: `Turn ${turn}.`, chars: 7, files: [] }))
const seeded: Record<string, unknown> = { thinking: held, notes: ['blind spots need git', HIDDEN] }

test('F05-AC14 with captureThinking: false, session.start empties thinking and removes the hidden footer note (DERIVED: the held state)', { options: { captureThinking: false } }, async ($, on) => {
  on('state.get', async (_$, e: any, next) => (e.key in seeded ? ({ value: { value: seeded[e.key], version: 0 } } as any) : next(e)))
  beneath(on)
  observe(on)
  await $.session.start(thinking.shown[0]!.input as any)
  expect(written.thinking).toEqual([])
  expect(written.notes).toEqual(['blind spots need git'])
})
