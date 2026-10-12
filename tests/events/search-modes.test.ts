import out from '../../fixtures/output/outputs'
import persisted from '../../fixtures/tool-results/bash-persisted'
import reference from '../../fixtures/sessions/reference'
import { expect, test } from 'claude-code/testing'
import { engine, graphOf, nodeOf, start } from './kit'

// A Bash result as the sessions record it (fixtures/sessions/reference.ts, step 3).
const recorded = reference.events.find(e => e.event === 'tool.call' && (e.input as any).command?.startsWith('rg -n'))!
const bashResult = (stdout: string, over: object = {}) => ({ ...(recorded.result as any).result, stdout, ...over })
const bash = ($: any, command: string) => $.tool.call({ tool: 'Bash', command })

function setup(on: any, stdout: string, over: object = {}) {
  return engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: bashResult(stdout, over) })
}

test('F02-AC3 rg -l verify output of three paths gives three search nodes (the capture holds two paths, a third is DERIVED)', async ($, on) => {
  setup(on, out['rg-l-verify'].stdout + 'src/auth/sessions.ts\n')
  await start($)
  await bash($, out['rg-l-verify'].command)
  const files = Object.values((await graphOf())!.files)
  expect(files.map(n => n.path).sort()).toEqual(['src/auth/login.ts', 'src/auth/password.ts', 'src/auth/sessions.ts'])
  for (const n of files) expect(n).toMatchObject({ state: 'search', hits: 1, seen: '1 search hit, never opened' })
})

test('F02-AC9 rg -c verify src changes nothing', async ($, on) => {
  const answer = setup(on, out['rg-c-verify-src'].stdout)
  await start($)
  expect(await bash($, out['rg-c-verify-src'].command)).toEqual(answer)
  expect(await graphOf()).toBe(undefined)
})

test('F02-AC10 rg verify src/auth/login.ts, whose two lines carry no path, gives login.ts 2 hits', async ($, on) => {
  setup(on, out['rg-verify-login'].stdout)
  await start($)
  await bash($, out['rg-verify-login'].command)
  const chars = out['rg-verify-login'].stdout.split('\n').filter(Boolean).reduce((n, l) => n + l.length, 0)
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ state: 'search', hits: 2, tokens: Math.ceil(chars / 4), seen: '2 search hits, never opened' })
  expect(Object.keys((await graphOf())!.files)).toEqual(['src/auth/login.ts'])
})

// Recorded: fixtures/tool-results/bash-persisted. Its stdout holds 30,000 characters; the preview Claude read (text) is about 2,000.
test('F02-AC15 with persistedOutputPath set, only the hits in the preview (text) count, none from the rest of stdout', async ($, on) => {
  const answer = setup(on, '')
  Object.assign(answer, { result: persisted.result, text: persisted.text })
  await start($)
  await bash($, persisted.input.command)
  const mine = (s: string) => s.split('\n').filter(l => l.startsWith('src/big-search.log:'))
  const seen = mine(persisted.text)
  expect(seen.length).toBeGreaterThan(10)
  expect(mine(persisted.result.stdout).length).toBeGreaterThan(seen.length * 5)
  expect(await nodeOf('src/big-search.log')).toMatchObject({
    state: 'search', hits: seen.length, tokens: Math.ceil(seen.reduce((c, l) => c + l.length, 0) / 4),
  })
})

test('F02-R9 without persistedOutputPath, text is not parsed (it also carries stderr)', async ($, on) => {
  const answer = setup(on, out['rg-n-verify-src-auth'].stdout)
  Object.assign(answer, { text: 'src/other/file.ts:1:from stderr\n' + out['rg-n-verify-src-auth'].stdout })
  await start($)
  await bash($, out['rg-n-verify-src-auth'].command)
  expect(await nodeOf('src/other/file.ts')).toBe(undefined)
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ hits: 2 })
})
