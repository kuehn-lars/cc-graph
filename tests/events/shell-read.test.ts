import cat from '../../fixtures/tool-results/bash-cat'
import sed from '../../fixtures/tool-results/bash-sed-n'
import out from '../../fixtures/output/outputs'
import { expect, mock, test } from 'claude-code/testing'
import { engine, graphOf, nodeOf, start, toolIds, turn, writes } from './kit'

type Recorded = { result: any; text: string; isReadOnly: boolean }

/** The kit's bottom hooks answering Bash with a recorded call, and a `git` that counts what it was asked. */
function setup(on: any, f: Recorded, root = '/w') {
  const answer: any = engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: f.result })
  answer.text = f.text
  answer.isReadOnly = f.isReadOnly
  const git: string[][] = []
  on('command.register', (_$: any, e: any) => ({ value: { command: e.name } }))
  on('process.run', (_$: any, e: any) => (git.push([...e.argv]), { value: { exitCode: 0, stdout: e.argv[1] === 'rev-parse' ? `${root}\n` : '', stderr: '' } }))
  return { answer, git }
}
const bash = ($: any, command: string) => $.tool.call({ tool: 'Bash', command })
const statuses = (git: string[][]) => git.filter(a => a[1] === 'status').length

test('F07-AC23 a read-only Bash call raises no process.run; the same call without isReadOnly raises a status', async ($, on) => {
  const clock = mock.clock(on)
  const { answer, git } = setup(on, cat)
  await start($); await clock.advance(50)
  await turn($); await clock.advance(50)
  const before = git.length
  await bash($, cat.input.command); await clock.advance(50)
  expect(git.length).toBe(before)
  answer.isReadOnly = undefined
  await bash($, cat.input.command); await clock.advance(50)
  expect(statuses(git)).toBeGreaterThan(statuses(git.slice(0, before)))
})

test('F07-AC24 cat src/auth/login.ts is read: "48 lines", tokens from the output, the call as readId', async ($, on) => {
  setup(on, cat)
  await start($)
  await bash($, cat.input.command)
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({
    state: 'read', seen: '48 lines', tokens: Math.ceil(cat.text.length / 4), readId: toolIds[0], mainLoop: true,
  })
})

test('F07-AC25 sed -n 1,5p is partial "lines 1 to 5"; a piped cat records no read', async ($, on) => {
  const { answer } = setup(on, sed)
  await start($)
  await bash($, sed.input.command)
  expect(await nodeOf('src/config.ts')).toMatchObject({ state: 'partial', seen: 'lines 1 to 5' })
  answer.result = cat.result
  await bash($, 'cat src/auth/session.ts | grep port')
  expect(await nodeOf('src/auth/session.ts')).toBe(undefined)
})

test('F07-R19 a call that searches and reads changes graph once', async ($, on) => {
  const { answer } = setup(on, cat)
  answer.result = { ...cat.result, stdout: out['rg-n-verify-src-auth'].stdout }
  await start($)
  await bash($, `${out['rg-n-verify-src-auth'].command} && cat src/config.ts`)
  expect(writes.filter(k => k === 'graph')).toHaveLength(1)
  expect(await nodeOf('src/config.ts')).toMatchObject({ state: 'read' })
  expect(await nodeOf('src/auth/password.ts')).toMatchObject({ state: 'search' })
  expect((await graphOf())!.seq).toBe(3)
})

test('F07-AC37 after an earlier cd src, cat auth/login.ts reads src/auth/login.ts', async ($, on) => {
  setup(on, cat)
  on('session.cwd', () => ({ value: '/w/src' })) // the Bash tool kept the cd
  await start($)
  await $.tool.call({ tool: 'Bash', command: 'cat auth/login.ts' })
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ state: 'read', seen: '48 lines' })
})
