import readWhole from '../../fixtures/tool-results/read-whole'
import { expect, test } from 'claude-code/testing'
import { engine, graphOf, nodeOf, start, turn } from './kit'

// No recording exists for `prompt.mention`: it carries no tool output, and the result `{ type }` is typed from index.d.ts.
const mention = ($: any, input: any) => $.prompt.mention({ mention: input.mention ?? input.path, ...input })
const answers = (on: any, result: any) => (engine0(on), on('prompt.mention', () => result), result)
const engine0 = (on: any) => engine(on, readWhole)

test('F01-AC9 @src/b.ts is read, "mentioned by you", tokens null', async ($, on) => {
  const answer = answers(on, { type: 'file' })
  await start($)
  await turn($)
  expect(await mention($, { path: '/w/src/b.ts' })).toEqual(answer)
  const n = await nodeOf($, 'src/b.ts')
  expect(n).toMatchObject({ path: 'src/b.ts', state: 'read', seen: 'mentioned by you', tokens: null, firstTurn: 1, lastTurn: 1, touched: 1 })
})

test('F01-AC15 @src/b.ts#L10-20 with offset 10, limit 11 is partial, "lines 10 to 20, mentioned by you"', async ($, on) => {
  answers(on, { type: 'file' })
  await start($)
  await mention($, { mention: 'src/b.ts#L10-20', path: '/w/src/b.ts', offset: 10, limit: 11 })
  const n = await nodeOf($, 'src/b.ts')
  expect(n).toMatchObject({ state: 'partial', seen: 'lines 10 to 20, mentioned by you', tokens: null })
})

test('F01-AC16 a pdf_reference mention is a ghost and the meter is unchanged', async ($, on) => {
  answers(on, { type: 'pdf_reference' })
  await start($)
  await $.tool.call({ tool: 'Read', file_path: '/w/src/auth/login.ts' })
  // I1: the meter sums `tokens` over in-context nodes; ghosts are not in context.
  const meter = async () => Object.values((await graphOf($))!.files).filter(f => f.state !== 'ghost').reduce((s, f) => s + (f.tokens ?? 0), 0)
  const before = await meter()
  expect(before).toBeGreaterThan(0)
  await mention($, { path: '/w/docs/spec.pdf' })
  expect(await nodeOf($, 'docs/spec.pdf')).toMatchObject({ state: 'ghost', seen: 'mentioned PDF, not attached', tokens: null })
  expect(await meter()).toBe(before)
})

test('F01-R7 a mention that resolves null leaves the graph unchanged', async ($, on) => {
  const answer = answers(on, { type: null })
  await start($)
  expect(await mention($, { path: '/w/src/b.ts' })).toEqual(answer)
  expect(await graphOf($)).toBe(undefined)
})

test('F01-R7 a mention never downgrades a node Claude already read', async ($, on) => {
  answers(on, { type: 'file' })
  await start($)
  await $.tool.call({ tool: 'Read', file_path: '/w/src/b.ts' })
  const before = await nodeOf($, 'src/b.ts')
  await mention($, { path: '/w/src/b.ts', offset: 10, limit: 11 })
  expect(await nodeOf($, 'src/b.ts')).toEqual({ ...before, touched: 2 })
})
