import thinking from '../../fixtures/sessions/thinking'
import { expect, test } from 'claude-code/testing'
import { beneath, observe, start, written } from './kit'
import { mount, ui } from '../ui/kit'

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

test('F05-AC4 a subagent step (agentId agent_1) streaming thinking stores no note and passes every chunk (DERIVED: the recorded agentId replaced by agent_1)', async ($, on) => {
  observe(on)
  model(on, [sub])
  const out = await read($, { ...sub.input, agentId: 'agent_1' })
  expect(out.chunks).toEqual(sub.chunks)
  expect(out.result).toEqual(sub.result)
  expect(written.thinking).toBeUndefined()
})

test('F05-AC10 a stream that yields a thinking chunk and then throws hands up that chunk and the error from beneath, and stores no note (DERIVED: the throw)', async ($, on) => {
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

/** The recorded step 0 with its thinking chunks replaced by chunks of `texts` in block 0 (refs dropped: a ref is the recorded step's only). */
const withThinking = (texts: string[], over: any = {}) => {
  const step = main[0]!
  return {
    ...step, ...over,
    input: { ...step.input, ...over.input },
    result: { ...step.result, ...over.result },
    chunks: [...texts.map(text => ({ kind: 'thinking', index: 0, text })), ...step.chunks.filter((c: any) => c.kind !== 'thinking')],
  }
}

test('F05-AC2 two thinking chunks "Look at " and "login.ts" in block 0 make one note "Look at login.ts" (DERIVED: the texts)', async ($, on) => {
  observe(on)
  const step = withThinking(['Look at ', 'login.ts'])
  model(on, [step])
  await read($, step.input)
  expect(written.thinking).toHaveLength(1)
  expect(written.thinking[0]).toMatchObject({ text: 'Look at login.ts', chars: 16, step: 0 })
})

test('F05-AC2 the recorded step 0 leaves one note of its joined block, with its turn and step', async ($, on) => {
  observe(on)
  model(on, [main[0]])
  await read($, main[0]!.input)
  const text = 'For step 1, I need to read two files using absolute paths within the sample-app directory: login.ts under src/auth and config.ts in src.\n\n'
  expect(written.thinking).toMatchObject([{ turn: 0, step: 0, chars: text.length, text }])
})

test('F05-AC3 a 2,000-character thinking block leaves 400 characters and chars 2000 (DERIVED: the recorded texts, cycled)', async ($, on) => {
  observe(on)
  const recorded = main[0]!.chunks.filter((c: any) => c.kind === 'thinking').map((c: any) => c.text)
  const texts: string[] = []
  for (let i = 0, n = 0; n < 2000; i++) {
    const t = [...recorded[i % recorded.length]].slice(0, 2000 - n).join('')
    texts.push(t)
    n += [...t].length
  }
  const step = withThinking(texts)
  model(on, [step])
  await read($, step.input)
  expect([...written.thinking[0].text]).toHaveLength(400)
  expect(written.thinking[0].text).toBe(texts.join('').slice(0, 400))
  expect(written.thinking[0].chars).toBe(2000)
})

test('F05-R2 two blocks with text are joined by a blank line, and chars counts the separator (DERIVED: the texts)', async ($, on) => {
  observe(on)
  const step = withThinking([])
  model(on, [{ ...step, chunks: [{ kind: 'thinking', index: 0, text: 'First.' }, { kind: 'thinking', index: 1, text: 'Second.' }, ...step.chunks] }])
  await read($, step.input)
  expect(written.thinking).toMatchObject([{ text: 'First.\n\nSecond.', chars: 15 }])
})

test('F05-R10 a caller that stops reading after the first thinking chunk stores no note', async ($, on) => {
  observe(on)
  model(on, [main[0]])
  for await (const c of $.turn.step(main[0]!.input)) if (c.kind === 'thinking') break
  expect(written.thinking).toBeUndefined()
  expect(written.notes).toBeUndefined()
})

test('F05-AC5 after 25 main-loop steps with thinking, the newest 20 notes remain (DERIVED: 25 steps from the recorded step 0)', async ($, on) => {
  observe(on)
  const steps = Array.from({ length: 25 }, (_, i) => withThinking([`Step ${i}.`], { input: { index: i }, result: { index: i } }))
  model(on, steps)
  for (const s of steps) await read($, s.input)
  expect(written.thinking.map((n: any) => n.step)).toEqual(Array.from({ length: 20 }, (_, i) => i + 5))
  expect(written.thinking.map((n: any) => n.text)).toEqual(Array.from({ length: 20 }, (_, i) => `Step ${i + 5}.`))
})

test('F05-AC6 a Read and an Edit of /w/src/a.ts in cwd /w give files [src/a.ts] (DERIVED: the toolUses)', async ($, on) => {
  const toolUses = [{ name: 'Read', input: { file_path: '/w/src/a.ts' } }, { name: 'Edit', input: { file_path: '/w/src/a.ts' } }]
  const step = { ...main[0]!, result: { ...main[0]!.result, toolUses } }
  beneath(on)
  observe(on)
  model(on, [step])
  await start($)
  await read($, step.input)
  expect(written.thinking[0].files).toEqual(['src/a.ts'])
})

test('F05-R3 a NotebookEdit of /w/nb/a.ipynb in cwd /w gives files [nb/a.ipynb] (DERIVED: the toolUses)', async ($, on) => {
  const step = { ...main[0]!, result: { ...main[0]!.result, toolUses: [{ name: 'NotebookEdit', input: { notebook_path: '/w/nb/a.ipynb', new_source: '' } }] } }
  beneath(on)
  observe(on)
  model(on, [step])
  await start($)
  await read($, step.input)
  expect(written.thinking[0].files).toEqual(['nb/a.ipynb'])
})

test('F05-AC6 the recorded step 0 in its recorded cwd names src/auth/login.ts and src/config.ts', async ($, on) => {
  beneath(on)
  observe(on)
  model(on, [main[0]])
  await $.session.start(thinking.shown[0]!.input as any)
  await $.turn.start(thinking.shown[1]!.input as any)
  await read($, main[0]!.input)
  expect(written.thinking).toMatchObject([{ turn: 1, step: 0, files: ['src/auth/login.ts', 'src/config.ts'] }])
})

const hidden = thinking.hidden.filter(r => r.event === 'turn.step').map((s: any) => ({ ...s, chunks: s.chunks.filter((c: any) => c.kind !== 'engine') }))
const hiddenMain = hidden.filter(s => !s.input.agentId)
const HIDDEN = 'Thinking is hidden: turn on showThinkingSummaries to see it.'
/** The footer note of F05-R6 as the list view draws it. */
const footer = async ($: any) => (await (await mount($, 'terminal')).findAll({ type: 'Text', text: /Thinking is hidden/ })).map((t: any) => t.text)

test('F05-AC7 steps whose thinking chunks are all empty store no note, and the footer says once that thinking is hidden', async ($, on) => {
  ui(on)
  observe(on)
  model(on, hiddenMain)
  await start($)
  await read($, hiddenMain[0]!.input)
  await read($, hiddenMain[1]!.input)
  expect(written.thinking).toBeUndefined()
  expect(written.notes).toEqual([HIDDEN])
  expect(await footer($)).toEqual([HIDDEN])
})

test('F05-AC9 after the footer note, a step with thinking "Read the test." stores a note and the footer note is gone (DERIVED: the text)', async ($, on) => {
  ui(on)
  observe(on)
  const shown = withThinking(['Read the test.'])
  model(on, [hiddenMain[0], shown])
  await start($)
  await read($, hiddenMain[0]!.input)
  expect(written.notes).toEqual([HIDDEN])
  await read($, shown.input)
  expect(written.thinking).toMatchObject([{ text: 'Read the test.' }])
  expect(written.notes).toEqual([])
  expect(await footer($)).toEqual([])
})

test('F05-AC15 a step whose only thinking block is "\\n\\n" stores no note and adds the hidden footer note (DERIVED: the hidden recording\'s chunks with whitespace)', async ($, on) => {
  ui(on)
  observe(on)
  const step = hiddenMain[0]!
  const chunks = step.chunks.map((c: any) => (c.kind === 'thinking' ? { ...c, text: '\n' } : c))
  model(on, [{ ...step, chunks }])
  await start($)
  await read($, step.input)
  expect(written.thinking).toBeUndefined()
  expect(written.notes).toEqual([HIDDEN])
  expect(await footer($)).toEqual([HIDDEN])
})

test('F05-R6 a step with no thinking chunks at all adds no footer note (DERIVED: the recorded step 0 without its thinking)', async ($, on) => {
  observe(on)
  const step = withThinking([])
  model(on, [step])
  await read($, step.input)
  expect(written.notes).toBeUndefined()
})

test('F05-R6 a subagent step whose thinking is empty adds no footer note', async ($, on) => {
  observe(on)
  const step = hidden.find(s => s.input.agentId)!
  model(on, [step])
  await read($, step.input)
  expect(written.notes).toBeUndefined()
})
