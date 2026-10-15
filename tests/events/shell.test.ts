import out from '../../fixtures/output/outputs'
import reference from '../../fixtures/sessions/reference'
import { expect, mock, test } from 'claude-code/testing'
import { node } from '../ui/kit'
import { engine, nodeOf, seedGraph, start, turn, written } from './kit'

const step = (tool: string) => reference.events.find(e => e.event === 'tool.call' && (e.input as any).tool === tool && (e.result as any).result?.filePath)!

// A Bash result as the sessions record it (fixtures/sessions/reference.ts), with no output.
const recorded = reference.events.find(e => e.event === 'tool.call' && (e.input as any).command?.startsWith('rg -n'))!
const quiet = { ...(recorded.result as any).result, stdout: '' }
const npm = 'npm install --no-audit --no-fund --loglevel=error rate-limiter-flexible' // the command the captures ran

/** The test's `git` beneath the mod: `rev-parse` answers `root` (or fails), each `status` the next of `statuses` (the last repeats). Returns the argument lists it saw. */
function git(on: any, statuses: string[], root: string | null = '/w') {
  const seen: string[][] = []
  on('command.register', (_$: any, e: any) => ({ value: { command: e.name } }))
  on('process.run', (_$: any, e: any) => {
    seen.push([...e.argv])
    if (e.argv[1] === 'rev-parse') return { value: root ? { exitCode: 0, stdout: `${root}\n`, stderr: '' } : { exitCode: 128, stdout: '', stderr: 'fatal: not a git repository' } }
    return { value: { exitCode: 0, stdout: statuses.length > 1 ? statuses.shift()! : statuses[0]!, stderr: '' } }
  })
  return seen
}

/** Starts the session and a turn, runs one Bash `command`, and lets the queue drain after each. */
async function session($: any, clock: any, command = npm) {
  await start($); await clock.advance(50)
  await turn($); await clock.advance(50)
  await $.tool.call({ tool: 'Bash', command }); await clock.advance(50)
}

test('F07-AC2 npm install rewrites package.json: change blind, state unread, a reason naming npm install', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  git(on, [out['git-status-clean'].stdout, out['git-status-clean'].stdout, out['git-status-after-npm-install'].stdout])
  await session($, clock)
  expect(await nodeOf('package.json')).toMatchObject({ change: 'blind', state: 'unread', reason: `changed by \`${npm.slice(0, 59)}…\`` })
})

test('F07-AC12 a file a command created is created, unread, with a reason naming the command', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  git(on, [out['git-status-clean'].stdout, out['git-status-clean'].stdout, out['git-status-after-npm-install'].stdout])
  await session($, clock, 'printf x > src/middleware/rateLimit.ts')
  expect(await nodeOf('src/middleware/rateLimit.ts')).toMatchObject({ change: 'created', state: 'unread', reason: 'created by `printf x > src/middleware/rateLimit.ts`' })
})

test('F07-AC13 rm and a rename: deleted files keep their state, the new path is created; one write of graph', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  seedGraph(on, { seq: 1, files: { 'src/db/redis.ts': node('src/db/redis.ts', 1) }, edges: [], decisions: [], compactions: [] })
  const after = out['git-status-after-npm-install'].stdout
  git(on, [after, after, out['git-status-variety'].stdout])
  await session($, clock, 'rm test/helpers.ts')
  expect(await nodeOf('src/db/redis.ts')).toMatchObject({ change: 'deleted', state: 'read', reason: 'deleted by `rm test/helpers.ts`' })
  expect(await nodeOf('test/helpers.ts')).toMatchObject({ change: 'deleted', state: 'unread' })
  expect(await nodeOf('src/db/store.ts')).toMatchObject({ change: 'created' })
  expect(written.graph.seq).toBe(5) // the seed's 1, then one touch for each of the four paths, in one write
})

test('F07-AC14 an untracked file a command removed is deleted', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  const variety = out['git-status-variety'].stdout
  git(on, [variety, variety, out['git-status-after-npm-install'].stdout])
  await session($, clock, 'rm "notes with space.md"')
  expect(await nodeOf('notes with space.md')).toMatchObject({ change: 'deleted' })
})

test('F07-AC15 outside a repository a Bash call runs no git status, and the footer says "Shell changes need git" once', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  const seen = git(on, [''], null)
  await session($, clock)
  await $.tool.call({ tool: 'Bash', command: 'rm a.ts' }); await clock.advance(50)
  expect(seen.map(a => a[1])).toEqual(['rev-parse'])
  expect(written.notes).toEqual(['Shell changes need git'])
})

test('F07-R6 a change Claude made with Edit is not blamed on the next command', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  seedGraph(on, { seq: 1, files: { 'package.json': node('package.json', 1, { change: 'edited', added: 1 }) }, edges: [], decisions: [], compactions: [] })
  git(on, [out['git-status-clean'].stdout, out['git-status-clean'].stdout, out['git-status-after-npm-install'].stdout])
  await session($, clock)
  expect(await nodeOf('package.json')).toMatchObject({ change: 'edited', reason: null })
})

test('F07-R8 the git calls run off the hook\'s path: a Bash call returns before git status is asked', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  const seen = git(on, [out['git-status-clean'].stdout])
  await start($); await clock.advance(50)
  const before = seen.length
  await $.tool.call({ tool: 'Bash', command: npm })
  expect(seen.length).toBe(before)
  await clock.advance(50)
  expect(seen.length).toBe(before + 1)
  expect(seen.every(a => a[0] === 'git')).toBe(true)
})

// The recorded Write (step 6) and Edit (step 8) results, with the path of the tree these tests run in: derived, no session ran in /w.
const wrote = (path: string) => ({ ...(step('Write').result as any).result, filePath: `/w/${path}` })
const edited = (path: string) => ({ ...(step('Edit').result as any).result, filePath: `/w/${path}` })
const statusCount = (seen: string[][]) => seen.filter(a => a[1] === 'status').length

test('F07-AC16 a file Claude wrote with Write and a later rm removed is deleted, "deleted by `rm notes/draft.md`"', async ($, on) => {
  const clock = mock.clock(on)
  const answer = engine(on, { tool: 'Write', tool_use_id: 'x', input: {}, result: wrote('notes/draft.md') })
  git(on, ['', '', '?? notes/draft.md\0', ''])
  await start($); await clock.advance(50)
  await turn($); await clock.advance(50)
  await $.tool.call({ tool: 'Write', file_path: '/w/notes/draft.md', content: 'x' }); await clock.advance(50)
  Object.assign(answer, { result: quiet })
  await $.tool.call({ tool: 'Bash', command: 'rm notes/draft.md' }); await clock.advance(50)
  expect(await nodeOf('notes/draft.md')).toMatchObject({ change: 'deleted', reason: 'deleted by `rm notes/draft.md`' })
})

test('F07-AC3 an Edit of a.ts, then a command with a.ts modified in git status: a.ts stays edited, no blind mark', async ($, on) => {
  const clock = mock.clock(on)
  const answer = engine(on, { tool: 'Edit', tool_use_id: 'x', input: {}, result: edited('a.ts') })
  git(on, ['', '', ' M a.ts\0'])
  await start($); await clock.advance(50)
  await turn($); await clock.advance(50)
  await $.tool.call({ tool: 'Edit', file_path: '/w/a.ts', old_string: 'a', new_string: 'b' }); await clock.advance(50)
  Object.assign(answer, { result: quiet })
  await $.tool.call({ tool: 'Bash', command: npm }); await clock.advance(50)
  expect(await nodeOf('a.ts')).toMatchObject({ change: 'edited', reason: null })
})

test('F07-AC10 README.md modified between two turns: the second turn\'s npm test does not blame it', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  git(on, ['', '', ' M README.md\0'])
  await start($); await clock.advance(50)
  await turn($, 't1'); await clock.advance(50)
  await turn($, 't2'); await clock.advance(50)
  await $.tool.call({ tool: 'Bash', command: 'npm test' }); await clock.advance(50)
  expect(await nodeOf('README.md')).toBeUndefined()
})

test('NFR-P6 a burst of three Edits queues one baseline refresh', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Edit', tool_use_id: 'x', input: {}, result: edited('a.ts') })
  const seen = git(on, [''])
  await start($); await clock.advance(50)
  await turn($); await clock.advance(50)
  const before = statusCount(seen)
  for (let i = 0; i < 3; i++) await $.tool.call({ tool: 'Edit', file_path: '/w/a.ts', old_string: 'a', new_string: 'b' })
  await clock.advance(50)
  expect(statusCount(seen) - before).toBe(1)
})
