import reference from '../../fixtures/sessions/reference'
import readWhole from '../../fixtures/tool-results/read-whole'
import { expect, test } from 'claude-code/testing'
import { engine, graphOf, written, writes } from './kit'

// The recorded `classic.InstructionsLoaded` rows of the reference session: the nested load (step 2) and the project one at start.
const loads = reference.events.filter(e => e.event === 'classic.InstructionsLoaded').map(e => e.input as any)
const nested = loads.find(l => l.load_reason === 'nested_traversal')
const project = loads.find(l => l.load_reason === 'session_start')
const cwd = (reference.events[0]!.input as any).cwd
const canary = { stopReason: 'unknown to every hook' }

/** The test's bottom hooks: the recorded cwd, and `classic.InstructionsLoaded` and `classic.SessionStart` answer a canary. */
async function setup($: any, on: any) {
  engine(on, { tool: 'Read', tool_use_id: 'toolu_x', input: {}, result: readWhole.result })
  on('classic.InstructionsLoaded', () => canary)
  on('classic.SessionStart', () => canary)
  await $.session.start({ cwd, surface: null, isInteractive: false })
}

test('F04-R3 the reference session recorded a nested and a project load', () => {
  expect(nested.file_path).toBe(`${cwd}/src/auth/CLAUDE.md`)
  expect(project.file_path).toBe(`${cwd}/CLAUDE.md`)
})

test('F04-AC4 a nested_traversal load adds src/auth/CLAUDE.md as Project, "nested", tokens null, before any refresh', async ($, on) => {
  await setup($, on)
  await $.classic.InstructionsLoaded(nested)
  expect(written.memory).toEqual([{ path: 'src/auth/CLAUDE.md', type: 'Project', tokens: null, reason: 'nested' }])
  expect(writes.filter(k => k === 'memory')).toHaveLength(1)
})

test('F04-R3 the project CLAUDE.md loaded at start says "at start"', async ($, on) => {
  await setup($, on)
  await $.classic.InstructionsLoaded(project)
  expect(written.memory).toEqual([{ path: 'CLAUDE.md', type: 'Project', tokens: null, reason: 'at start' }])
})

// DERIVED: the reference session records two of the five reasons; the other three are the recorded row with `load_reason` changed.
for (const [load_reason, word] of [
  ['session_start', 'at start'], ['nested_traversal', 'nested'], ['path_glob_match', 'path rule'], ['include', 'import'], ['compact', 'after compaction'],
] as const)
  test(`F04-R3 load_reason ${load_reason} gives "${word}"`, async ($, on) => {
    await setup($, on)
    await $.classic.InstructionsLoaded({ ...nested, load_reason })
    expect(written.memory[0].reason).toBe(word)
  })

test('F04-AC5 CLAUDE.md as a note and read with Read is a note and a file node, and the meter counts it once', async ($, on) => {
  await setup($, on)
  await $.classic.InstructionsLoaded(project)
  await $.tool.call({ tool: 'Read', file_path: `${cwd}/CLAUDE.md` })
  expect(written.memory.map((m: any) => m.path)).toEqual(['CLAUDE.md'])
  const inContext = Object.values((await graphOf())!.files).filter(f => f.state === 'read')
  expect(inContext.map(f => f.path)).toEqual(['CLAUDE.md'])
})

test('F04-AC5 a note alone is no file node', async ($, on) => {
  await setup($, on)
  await $.classic.InstructionsLoaded(nested)
  expect(await graphOf()).toBe(undefined)
})

test('F04-R3 a second load of the same file updates its note and adds no other', async ($, on) => {
  await setup($, on)
  await $.classic.InstructionsLoaded(nested)
  await $.classic.InstructionsLoaded(project)
  await $.classic.InstructionsLoaded({ ...nested, memory_type: 'Local', load_reason: 'compact' }) // DERIVED: the recorded row, loaded again
  expect(written.memory).toEqual([
    { path: 'src/auth/CLAUDE.md', type: 'Local', tokens: null, reason: 'after compaction' },
    { path: 'CLAUDE.md', type: 'Project', tokens: null, reason: 'at start' },
  ])
})

test('F04-R3 /clear empties memory', async ($, on) => {
  await setup($, on)
  await $.classic.InstructionsLoaded(nested)
  await $.classic.SessionStart({ source: 'clear' })
  expect(written.memory).toEqual([])
})

test('F04-R3 returns what the handler beneath returned', async ($, on) => {
  await setup($, on)
  for (const row of loads) expect(await $.classic.InstructionsLoaded(row)).toStrictEqual(canary)
})
