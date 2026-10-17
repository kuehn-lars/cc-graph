import thinking from '../../fixtures/sessions/thinking'
import { expect, test } from 'claude-code/testing'
import { observe, written } from '../events/kit'

// The kit refuses an `engine` chunk from the bottom link (the test's), so the recorded step streams without its own.
const step: any = thinking.shown.find((r: any) => r.event === 'turn.step' && !r.input.agentId)!
const chunks = step.chunks.filter((c: any) => c.kind !== 'engine')

test('F14-AC2 with captureThinking: false, no note is stored and turn.step still passes every chunk', { options: { captureThinking: false } }, async ($, on) => {
  observe(on)
  on('turn.step', async function* () {
    for (const c of chunks) yield c
    return step.result
  })
  const got: any[] = []
  const stream = $.turn.step(step.input)
  let r = await stream.next()
  for (; !r.done; r = await stream.next()) got.push(r.value)
  expect(got).toEqual(chunks)
  expect(r.value).toEqual(step.result)
  expect(written.thinking).toBeUndefined()
})
