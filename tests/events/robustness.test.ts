import readWhole from '../../fixtures/tool-results/read-whole'
import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import { engine, graphOf, nodeOf, start, turn, written } from './kit'

const read = ($: any, file_path: string) => $.tool.call({ tool: 'Read', file_path })

/**
 * `engine` with fault injection: the first write of `key` throws beneath the mod, every other write is recorded as
 * `observe` does (one `state.set` hook per test). Every `ui.toast` and `ui.status` is recorded.
 */
function fault(on: On, key: string) {
  let thrown = false
  const shown: string[] = []
  for (const k of Object.keys(written)) delete written[k]
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('tool.call', () => ({ ref: 0, result: readWhole.result, text: '' }))
  on('state.set', (_$, e: any, next) => {
    if (e.key === key && !thrown) {
      thrown = true
      throw new Error(`injected: ${key}`)
    }
    written[e.key] = e.value
    return next(e)
  })
  on('ui.toast', (_$, e) => (shown.push(e.text), { value: undefined }))
  on('ui.status', (_$, e: any) => (shown.push(String(e.text)), { value: undefined }))
  return { shown, thrown: () => thrown }
}

test('NFR-R2 a turn.start whose write fails answers as beneath, shows nothing, and the next read is recorded', async ($, on) => {
  const injected = fault(on, 'turn')
  await start($)
  expect(await turn($, 't1')).toEqual({ turnId: 't1' })
  expect(injected.thrown()).toBe(true)
  await read($, '/w/src/auth/login.ts')
  expect((await nodeOf('src/auth/login.ts'))?.state).toBe('read')
  expect(injected.shown).toEqual([])
})

test('NFR-R2 a session.measure whose write fails answers as beneath, shows nothing, and the next read is recorded', async ($, on) => {
  const injected = fault(on, 'fill')
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await start($)
  const out = await $.session.measure({ context: { tokens: 82000, window: 200000, percent: 41 } as any, rateLimits: [], changed: ['context'] })
  expect(out).toEqual({ changed: ['context'] })
  expect(injected.thrown()).toBe(true)
  await read($, '/w/src/auth/login.ts')
  expect((await nodeOf('src/auth/login.ts'))?.state).toBe('read')
  expect(injected.shown).toEqual([])
})

// The ten paths are DERIVED: one recorded Read result answers every call; the node's path is the call's own input (F01-R11).
test('NFR-R5 ten concurrent Read calls give ten nodes', async ($, on) => {
  engine(on, readWhole)
  await start($)
  await turn($)
  await Promise.all(Array.from({ length: 10 }, (_, i) => read($, `/w/src/f${i}.ts`)))
  expect(Object.keys((await graphOf())!.files).sort()).toEqual([...Array.from({ length: 10 }, (_, i) => `src/f${i}.ts`), 'src/password.ts', 'src/sessions.ts'].sort()) // F06: ghosts of the recorded imports
  expect((await graphOf())!.seq).toBe(10)
})

// A reload runs `register` and raises `session.start` again; the kit cannot reload, so the second start reports another
// cwd (DERIVED) to show the module's `cwd` is rebuilt from it.
test('NFR-R6 a second session.start keeps the graph and rebuilds the cwd from what it reports', async ($, on) => {
  engine(on, readWhole)
  await start($)
  await turn($)
  await read($, '/w/src/auth/login.ts')
  const before = await graphOf()
  await $.session.start({ cwd: '/v', surface: null, isInteractive: false })
  expect(await graphOf()).toEqual(before)
  await read($, '/v/src/auth/sessions.ts')
  expect(Object.keys((await graphOf())!.files).sort()).toEqual(['src/auth/login.ts', 'src/auth/password.ts', 'src/auth/sessions.ts']) // F06: password.ts is login.ts's ghost
})
