import reference from '../../fixtures/sessions/reference'
import { expect, test } from 'claude-code/testing'
import { nodeOf, replay } from '../events/kit'

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
