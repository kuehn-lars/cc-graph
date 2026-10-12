import reference from '../../fixtures/sessions/reference'
import { expect, test } from 'claude-code/testing'
import { graphOf, nodeOf, replay } from '../events/kit'

const step3 = reference.events.find(e => e.step === 3)!.input as any

// The recording has `totalLines` 121 (the trailing newline), where RS-1 says 120: the spec follows the recording.
test('RS-1 after step 3, routes/index.ts is partial, login.ts is read with 2 hits, password.ts is search', async ($, on) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  await replay($, on, 3)
  expect(await nodeOf('src/routes/index.ts')).toMatchObject({ state: 'partial', seen: 'lines 1 to 40 of 121' })
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ state: 'read', hits: 2 })
  expect(await nodeOf('src/auth/password.ts')).toMatchObject({
    state: 'search', seen: '2 search hits, never opened', hits: 2, readId: step3.tool_use_id,
  })
})

// The three recorded processes each start a session: the /graph registration must go through every time.
test('RS-4 after the compaction and the five re-attachments, two files are compacted, the five are read, one CompactMark', async ($, on) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  const registered: string[] = []
  on('command.register', (_$, e, next) => (registered.push(e.name), next(e)))
  await replay($, on, 9, true)
  expect(registered).toEqual(['graph', 'graph', 'graph'])
  const graph = (await graphOf())!
  const files = (paths: string[]) => paths.map(p => graph.files[p]?.state)
  expect(files(['src/routes/index.ts', 'src/auth/password.ts'])).toEqual(['compacted', 'compacted'])
  expect(files(['src/auth/login.ts', 'src/middleware/rateLimit.ts', 'src/config.ts', 'src/db/redis.ts', 'src/auth/sessions.ts']))
    .toEqual(Array(5).fill('read'))
  // The change marks of steps 5 and 8 (the create and the edit) survive the compaction and the re-attachments.
  expect(Object.fromEntries(Object.values(graph.files).filter(n => n.change).map(n => [n.path, n.change])))
    .toEqual({ 'src/auth/login.ts': 'edited', 'src/middleware/rateLimit.ts': 'created' })
  expect(graph.compactions).toEqual([{ turn: 1, trigger: 'manual', tokensBefore: 22694, tokensAfter: 4959, kept: 0 }])
})
