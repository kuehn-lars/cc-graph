import thinking from '../../fixtures/sessions/thinking'
import { expect, test } from 'claude-code/testing'
import { observe, written } from './kit'

// F05: the test's `turn.step` hook sits beneath the mod and stands in for the model, streaming a recorded step.
// The kit refuses an `engine` chunk from a link that never pulled it, and the test's link is the bottom: the recorded steps stream without theirs.
const steps = thinking.shown.filter(r => r.event === 'turn.step').map((s: any) => ({ ...s, chunks: s.chunks.filter((c: any) => c.kind !== 'engine') }))
const main = steps.filter(s => !s.input.agentId)
const sub = steps.find(s => s.input.agentId)!

/** Answers each step by its index from `recorded`; with `fail`, throws it after the first chunk. */
function model(on: any, recorded: readonly any[], fail?: Error) {
  on('turn.step', async function* (_$: any, e: any) {
    const step = recorded.find(s => s.input.turnId === e.turnId && s.input.index === e.index)!
    for (const c of step.chunks) {
      yield c
      if (fail) throw fail
    }
    return step.result
  })
}

/** Reads the stream the mod hands up: every chunk, then what it returns. */
async function read($: any, input: any) {
  const stream = $.turn.step(input)
  const chunks: any[] = []
  for (let r = await stream.next(); ; r = await stream.next()) {
    if (r.done) return { chunks, result: r.value }
    chunks.push(r.value)
  }
}

test('F05-AC1 a step of text, thinking, tool, input and stop chunks leaves the hook unchanged, in order, with its result', async ($, on) => {
  observe(on)
  model(on, main)
  const seen = new Set<string>()
  for (const s of main) {
    const out = await read($, s.input)
    expect(out.chunks).toEqual(s.chunks)
    expect(out.result).toEqual(s.result)
    for (const c of s.chunks) seen.add(c.kind)
  }
  expect([...seen].sort()).toEqual(['input', 'stop', 'text', 'thinking', 'tool'])
})

test('F05-AC4 a subagent step (agentId agent_1) streaming thinking stores no note and passes every chunk', async ($, on) => {
  observe(on)
  model(on, [sub])
  const out = await read($, { ...sub.input, agentId: 'agent_1' })
  expect(out.chunks).toEqual(sub.chunks)
  expect(out.result).toEqual(sub.result)
  expect(written.thinking).toBeUndefined()
})

test('F05-AC10 a stream that yields a thinking chunk and then throws hands up that chunk and the same error, and stores no note (DERIVED: the throw)', async ($, on) => {
  observe(on)
  const step = main[0]!
  const first = step.chunks.find((c: any) => c.kind === 'thinking')!
  model(on, [{ ...step, chunks: [first] }], new Error('stream beneath failed'))
  const got: any[] = []
  const caught = await (async () => {
    try {
      for await (const c of $.turn.step(step.input)) got.push(c)
    } catch (err) {
      return err as Error
    }
  })()
  // The kit skips a test link that throws, so what rejects beneath the mod is the kit's own "no implementation" error: the caller must get that one.
  expect(got).toEqual([first])
  expect(caught?.message).toBe('no implementation for turn.step')
  expect(written.thinking).toBeUndefined()
})
