import out from '../../fixtures/output/outputs'
import reference from '../../fixtures/sessions/reference'
import readWhole from '../../fixtures/tool-results/read-whole'
import { expect, mock, test } from 'claude-code/testing'
import { engine, graphOf, nodeOf, start, turn, written } from './kit'

const edit = reference.events.find(e => e.event === 'tool.call' && (e.input as any).tool === 'Edit' && (e.result as any).result?.filePath)!
const edited = (path: string) => ({ ...(edit.result as any).result, filePath: `/w/${path}` })
const found = out['git-grep-importers-login'].stdout

/** The test's `git` beneath the mod: the root is /w, there is no HEAD, each status the next of `statuses` (the last repeats; clean by default) and `grep` answers `grep`. Returns the argument lists it saw. */
function git(on: any, grep: string, failing?: ($: any) => Promise<never>, statuses: string[] = ['']) {
  const seen: string[][] = []
  on('command.register', (_$: any, e: any) => ({ value: { command: e.name } }))
  on('process.run', (_$: any, e: any) => {
    seen.push([...e.argv])
    const [, sub, arg] = e.argv
    if (sub === 'grep' && failing) return failing(_$)
    if (sub === 'grep') return { value: { exitCode: grep ? 0 : 1, stdout: grep, stderr: '' } }
    if (sub === 'rev-parse' && arg === 'HEAD') return { value: { exitCode: 128, stdout: '', stderr: '' } }
    if (sub === 'status') return { value: { exitCode: 0, stdout: statuses.length > 1 ? statuses.shift()! : statuses[0]!, stderr: '' } }
    return { value: { exitCode: 0, stdout: sub === 'rev-parse' ? '/w\n' : '', stderr: '' } }
  })
  return seen
}
const greps = (seen: string[][]) => seen.filter(a => a[1] === 'grep')
const editLogin = ($: any) => $.tool.call({ tool: 'Edit', file_path: '/w/src/auth/login.ts', old_string: 'a', new_string: 'b' })

async function session($: any, clock: any) {
  await start($); await clock.advance(50)
  await turn($); await clock.advance(50)
}

test('F07-AC1 an Edit of login.ts without opening users.ts: users.ts is a ghost and its edge to login.ts is blind', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Edit', tool_use_id: 'x', input: {}, result: edited('src/auth/login.ts') })
  const seen = git(on, found)
  await session($, clock)
  await editLogin($); await clock.advance(100)
  expect(await nodeOf('src/api/users.ts')).toMatchObject({ state: 'ghost' })
  expect((await graphOf())?.edges).toContainEqual({ from: 'src/api/users.ts', to: 'src/auth/login.ts', kind: 'import', blind: true, guessed: false })
  const [grep] = greps(seen)
  expect(grep!.slice(0, 7)).toEqual(['git', 'grep', '-n', '-I', '--untracked', '-E', '-e'])
  expect(grep!.slice(grep!.indexOf('--') + 1)).toContain('*.ts')
})

test('F07-AC7 two Edit calls on login.ts in one turn run git grep once', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Edit', tool_use_id: 'x', input: {}, result: edited('src/auth/login.ts') })
  const seen = git(on, found)
  await session($, clock)
  await editLogin($); await editLogin($); await clock.advance(100)
  expect(greps(seen)).toHaveLength(1)
  await turn($, 't2'); await clock.advance(50)
  await editLogin($); await clock.advance(100)
  expect(greps(seen)).toHaveLength(2) // the next turn searches again
})

test('F07-AC8 the Edit hook has returned before the first process.run for it', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Edit', tool_use_id: 'x', input: {}, result: edited('src/auth/login.ts') })
  const seen = git(on, found)
  await session($, clock)
  const before = seen.length
  await editLogin($)
  expect(seen.length).toBe(before)
  await clock.advance(100)
  expect(greps(seen)).toHaveLength(1)
})

test('F07-AC9 (derived) a hit whose specifier resolves to another login.ts adds no edge and no node', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Edit', tool_use_id: 'x', input: {}, result: edited('src/auth/login.ts') })
  git(on, "src/admin/panel.ts:1:import { x } from './login'\n")
  await session($, clock)
  await editLogin($); await clock.advance(100)
  expect(await nodeOf('src/admin/panel.ts')).toBeUndefined()
  expect((await graphOf())?.edges.filter(e => e.to === 'src/auth/login.ts')).toEqual([])
})

test('F07-AC11 reading the ghost clears the blind edge', async ($, on) => {
  const clock = mock.clock(on)
  const answer = engine(on, { tool: 'Edit', tool_use_id: 'x', input: {}, result: edited('src/auth/login.ts') })
  git(on, found)
  await session($, clock)
  await editLogin($); await clock.advance(100)
  Object.assign(answer, { result: readWhole.result })
  await $.tool.call({ tool: 'Read', file_path: '/w/src/api/users.ts' })
  expect(await nodeOf('src/api/users.ts')).toMatchObject({ state: 'read' })
  expect((await graphOf())?.edges.find(e => e.from === 'src/api/users.ts' && e.to === 'src/auth/login.ts')).toMatchObject({ blind: false })
})

// F07-R9: a git job that fails or runs past its timeout is dropped. The engine enforces `timeoutMs` and rejects the `process.run`; the stand-in rejects the same way. (Waiting out 5 seconds on the mocked clock would hold the queue's own timer, which the clock runs to its end before it moves on.)
const timedOut = async (): Promise<never> => { throw new Error('timed out after 5000ms') }

test('F07-AC5 (derived) a git grep past 5 seconds is dropped: the Edit result is unaffected, the debug log has the reason, the footer says so once', async ($, on) => {
  const clock = mock.clock(on)
  const answer = engine(on, { tool: 'Edit', tool_use_id: 'x', input: {}, result: edited('src/auth/login.ts') })
  const logs: { text: string; to: string }[] = []
  on('ui.log', (_$: any, e: any) => (logs.push({ text: e.text, to: e.to }), { value: undefined }))
  git(on, found, timedOut)
  await session($, clock)
  const out = await editLogin($)
  expect(out.result).toEqual(answer.result)
  await clock.advance(100)
  expect(await nodeOf('src/api/users.ts')).toBeUndefined()
  expect(written.notes).toEqual(['Blind-spot search timed out'])
  expect(logs).toEqual([{ text: expect.stringMatching(/^git job dropped: /), to: 'debug' }]) // the reason is the engine's own text for the rejection
  await turn($, 't2'); await clock.advance(50)
  await editLogin($); await clock.advance(100)
  expect(written.notes).toEqual(['Blind-spot search timed out']) // once per conversation
  expect(logs.every(l => l.to === 'debug')).toBe(true)
})

test('F07-AC4 git cannot start: nothing reaches the transcript and the footer says "Shell changes need git"', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Edit', tool_use_id: 'x', input: {}, result: edited('src/auth/login.ts') })
  const logs: any[] = []
  on('ui.log', (_$: any, e: any) => (logs.push(e), { value: undefined }))
  on('command.register', (_$: any, e: any) => ({ value: { command: e.name } }))
  on('process.run', () => { throw new Error('spawn git ENOENT') })
  await session($, clock)
  await editLogin($); await clock.advance(100)
  expect(written.notes).toEqual(['Shell changes need git'])
  expect(logs.filter(l => l.to !== 'debug')).toEqual([])
})

test('F07-AC34 sed -i on login.ts, a change the command names, searches for its importers: users.ts is a blind ghost', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: { stdout: '', stderr: '', interrupted: false } })
  const seen = git(on, found, undefined, ['', '', ' M src/auth/login.ts\0'])
  await session($, clock)
  await $.tool.call({ tool: 'Bash', command: "sed -i '' 's/verify/verifyUser/' src/auth/login.ts" }); await clock.advance(100)
  expect(greps(seen)).toHaveLength(1)
  expect(await nodeOf('src/api/users.ts')).toMatchObject({ state: 'ghost' })
  expect((await graphOf())?.edges).toContainEqual({ from: 'src/api/users.ts', to: 'src/auth/login.ts', kind: 'import', blind: true, guessed: false })
})

test('F07-R2 a change no command named searches nothing', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: { stdout: '', stderr: '', interrupted: false } })
  const seen = git(on, found, undefined, ['', '', ' M src/auth/login.ts\0'])
  await session($, clock)
  await $.tool.call({ tool: 'Bash', command: 'npm run format' }); await clock.advance(100)
  expect(greps(seen)).toHaveLength(0)
})
