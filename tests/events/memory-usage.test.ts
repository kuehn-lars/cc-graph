import { fullBreakdowns } from '../../scripts/full-breakdown.mjs'
import memory from '../../fixtures/sessions/memory'
import reference from '../../fixtures/sessions/reference'
import readWhole from '../../fixtures/tool-results/read-whole'
import { expect, test } from 'claude-code/testing'
import { engine, written, writes } from './kit'

// The recorded usage (ticket 01): `session.start`'s `usage` lists one memory file, CLAUDE.md with 60 tokens.
const recorded = (memory.events[0] as any).usage
const mcwd: string = (memory.events[0]!.input as any).cwd
const measure = memory.events.find(e => e.event === 'session.measure')!.input as any
const files = recorded.context.breakdown.memoryFiles as { path: string; type: string; tokens: number }[]
// DERIVED: the recording has one memory file; a second is the first with another path, type and size.
const second = { path: `${mcwd}/.claude/CLAUDE.local.md`, type: 'Local', tokens: 21 }
const withFiles = (memoryFiles: unknown[]) => ({ ...recorded, context: { ...recorded.context, breakdown: { ...recorded.context.breakdown, memoryFiles } } })
// DERIVED: the recorded result without its `breakdown`.
const noBreakdown = { ...recorded, context: { ...recorded.context, breakdown: undefined } }

const rcwd = (reference.events[0]!.input as any).cwd
const nestedLoad = reference.events.find(e => e.event === 'classic.InstructionsLoaded' && (e.input as any).load_reason === 'nested_traversal')!.input as any
const nestedRow = reference.events.find(e => e.event === 'prompt.attachment' && (e.input as any).type === 'nested_memory' && !(e.input as any).agentId)!.input as any
const subagentRow = reference.events.find(e => e.event === 'prompt.attachment' && (e.input as any).agentId && (e.input as any).type === 'nested_memory')!.input as any
const measured = { changed: ['context'] }
const attached = { text: 'unknown to every hook' }

/** The test's bottom hooks: `session.usage` answers `answer.usage` and records its arguments; the rest answer a canary. */
function setup($: any, on: any, usage: unknown) {
  const answer = { usage: usage as unknown }
  const calls: any[] = []
  const beneath = { measure: 0 }
  engine(on, { tool: 'Read', tool_use_id: 'toolu_x', input: {}, result: readWhole.result })
  on('session.usage', (_$: any, e: any) => {
    calls.push(e)
    if (answer.usage === 'throw') throw new Error('no usage')
    return { value: answer.usage }
  })
  on('command.register', () => ({ value: { command: 'graph' } }))
  on('session.measure', () => (beneath.measure++, measured))
  on('classic.InstructionsLoaded', () => ({ stopReason: 'unknown to every hook' }))
  on('prompt.attachment', () => attached)
  return { answer, calls, beneath }
}
const start = ($: any, cwd = mcwd) => $.session.start({ cwd, surface: null, isInteractive: false })
const changed = (units: string[]) => ({ ...measure, changed: units })

test('F04-R1 the recording lists one memory file, CLAUDE.md of 60 tokens', () => {
  expect(files).toEqual([{ path: `${mcwd}/CLAUDE.md`, type: 'Project', tokens: 60 }])
})

test('F04-AC1 session.start with the recorded usage notes CLAUDE.md with type and tokens', async ($, on) => {
  const { calls } = setup($, on, recorded)
  await start($)
  expect(written.memory).toEqual([{ path: 'CLAUDE.md', type: 'Project', tokens: 60, reason: null }])
  expect(calls).toEqual([{ breakdown: 'summary' }])
})

test('F04-AC1 two memory files give two notes with path, type and tokens', async ($, on) => {
  setup($, on, withFiles([...files, second]))
  await start($)
  expect(written.memory).toEqual([
    { path: 'CLAUDE.md', type: 'Project', tokens: 60, reason: null },
    { path: '.claude/CLAUDE.local.md', type: 'Local', tokens: 21, reason: null },
  ])
  expect(writes.filter(k => k === 'memory')).toHaveLength(1)
})

test('F04-AC1 session.measure with context in changed refreshes', async ($, on) => {
  const { answer, calls } = setup($, on, withFiles([]))
  await start($)
  expect(written.memory).toEqual([])
  answer.usage = recorded
  await $.session.measure(changed(['context']))
  expect(written.memory).toHaveLength(1)
  expect(calls).toHaveLength(2)
})

test('F04-AC2 a file gone from the breakdown: its note is gone after the next refresh', async ($, on) => {
  const { answer } = setup($, on, withFiles([...files, second]))
  await start($)
  answer.usage = recorded
  await $.session.measure(changed(['context']))
  expect(written.memory.map((n: any) => n.path)).toEqual(['CLAUDE.md'])
})

test('F04-R1 a refresh keeps the reason of a note it lists, and takes the breakdown\'s tokens', async ($, on) => {
  setup($, on, recorded)
  await start($)
  await $.classic.InstructionsLoaded({ ...nestedLoad, file_path: `${mcwd}/CLAUDE.md`, memory_type: 'Project', load_reason: 'session_start' }) // DERIVED: the recorded row, for this cwd's CLAUDE.md
  expect(written.memory).toEqual([{ path: 'CLAUDE.md', type: 'Project', tokens: null, reason: 'at start' }])
  await $.session.measure(changed(['context']))
  expect(written.memory).toEqual([{ path: 'CLAUDE.md', type: 'Project', tokens: 60, reason: 'at start' }])
})

test('F04-R1 a listed note keeps its "nested" reason, and listed notes come before kept ones', async ($, on) => {
  setup($, on, withFiles([{ path: `${rcwd}/src/auth/CLAUDE.md`, type: 'Project', tokens: 33 }, { path: `${rcwd}/CLAUDE.md`, type: 'Project', tokens: 60 }]))
  await start($, rcwd)
  await $.classic.InstructionsLoaded(nestedLoad)
  await $.session.measure(changed(['context']))
  expect(written.memory.map((n: any) => [n.path, n.tokens, n.reason])).toEqual([['src/auth/CLAUDE.md', 33, 'nested'], ['CLAUDE.md', 60, null]])
})

test('F04-AC8 a refresh keeps an unlisted "nested" note with its tokens, and drops an unlisted "at start" note', async ($, on) => {
  setup($, on, withFiles([]))
  await start($, rcwd)
  await $.classic.InstructionsLoaded(nestedLoad)
  await $.prompt.attachment(nestedRow)
  await $.classic.InstructionsLoaded({ ...nestedLoad, file_path: `${rcwd}/CLAUDE.md`, load_reason: 'session_start' }) // DERIVED: the recorded row, for the project file
  await $.session.measure(changed(['context']))
  expect(written.memory).toEqual([{ path: 'src/auth/CLAUDE.md', type: 'Project', tokens: expect.any(Number), reason: 'nested' }])
  expect(written.memory[0].tokens).toBeGreaterThan(0)
})

// DERIVED: the recorded row with another reason.
for (const [load_reason, word] of [['path_glob_match', 'path rule'], ['include', 'import']] as const)
  test(`F04-AC8 a refresh keeps an unlisted "${word}" note`, async ($, on) => {
    setup($, on, withFiles([]))
    await start($, rcwd)
    await $.classic.InstructionsLoaded({ ...nestedLoad, load_reason })
    await $.session.measure(changed(['context']))
    expect(written.memory).toEqual([{ path: 'src/auth/CLAUDE.md', type: 'Project', tokens: null, reason: word }])
  })

test('F04-AC8 an unlisted "after compaction" note is dropped', async ($, on) => {
  setup($, on, withFiles([]))
  await start($, rcwd)
  await $.classic.InstructionsLoaded({ ...nestedLoad, load_reason: 'compact' }) // DERIVED
  await $.session.measure(changed(['context']))
  expect(written.memory).toEqual([])
})

test('F04-AC7 the nested attachment sizes the "nested" note with ceil(characters / 4)', async ($, on) => {
  setup($, on, withFiles([]))
  await start($, rcwd)
  await $.classic.InstructionsLoaded(nestedLoad)
  await $.prompt.attachment(nestedRow)
  expect(written.memory).toEqual([{ path: 'src/auth/CLAUDE.md', type: 'Project', tokens: Math.ceil(nestedRow.text.length / 4), reason: 'nested' }])
})

test('F04-AC7 an attachment with an agentId changes nothing', async ($, on) => {
  setup($, on, withFiles([]))
  await start($, rcwd)
  await $.classic.InstructionsLoaded(nestedLoad)
  await $.prompt.attachment(subagentRow)
  expect(written.memory).toEqual([{ path: 'src/auth/CLAUDE.md', type: 'Project', tokens: null, reason: 'nested' }])
})

test('F04-AC7 an attachment for a path with no note changes nothing', async ($, on) => {
  setup($, on, withFiles([]))
  await start($, rcwd)
  await $.prompt.attachment(nestedRow)
  expect(written.memory ?? []).toEqual([])
})

test('F04-AC7 an attachment of another type changes nothing', async ($, on) => {
  setup($, on, withFiles([]))
  await start($, rcwd)
  await $.classic.InstructionsLoaded(nestedLoad)
  await $.prompt.attachment({ ...nestedRow, type: 'file' }) // DERIVED: the recorded row with another type
  expect(written.memory[0].tokens).toBe(null)
})

test('F04-AC6 usage with no breakdown leaves memory as it is', async ($, on) => {
  const { answer } = setup($, on, recorded)
  await start($)
  const before = written.memory
  answer.usage = noBreakdown
  await $.session.measure(changed(['context']))
  expect(written.memory).toEqual(before)
  expect(before).toHaveLength(1)
})

test('F04-R1 a failing usage call leaves memory as it is and runs the handler beneath once', async ($, on) => {
  const { answer, beneath } = setup($, on, recorded)
  await start($)
  const before = written.memory
  answer.usage = 'throw'
  expect(await $.session.measure(changed(['context']))).toStrictEqual(measured)
  expect(written.memory).toEqual(before)
  expect(beneath.measure).toBe(1)
})

test('F04-R1 session.measure without context in changed calls nothing', async ($, on) => {
  const { calls } = setup($, on, recorded)
  await start($)
  await $.session.measure(changed(['rateLimits', 'cost']))
  expect(calls).toHaveLength(1) // only session.start's
})

test('F04-R1 every case returns what the handler beneath returned', async ($, on) => {
  setup($, on, recorded)
  expect(await start($)).toStrictEqual({ cwd: mcwd })
  expect(await $.session.measure(changed(['context']))).toStrictEqual(measured)
  expect(await $.session.measure(changed(['cost']))).toStrictEqual(measured)
  await $.classic.InstructionsLoaded(nestedLoad)
  expect(await $.prompt.attachment(nestedRow)).toStrictEqual(attached)
  expect(await $.prompt.attachment(subagentRow)).toStrictEqual(attached)
})

// F04-R2, NFR-S6: `check-calls.mjs` runs this scan over every file of hooks/ (the check command), so a hit there fails the build.
test('F04-AC3 the scan finds a planted breakdown: \'full\' and leaves \'summary\' alone', () => {
  expect(fullBreakdowns("await $.session.usage({ breakdown: 'full' })")).toHaveLength(1)
  expect(fullBreakdowns('usage({breakdown:"full"})')).toHaveLength(1)
  expect(fullBreakdowns("usage({ breakdown: 'summary' })")).toEqual([])
})
