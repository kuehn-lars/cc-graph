import readWhole from '../../fixtures/tool-results/read-whole'
import readRanged from '../../fixtures/tool-results/read-ranged'
import readTokenCapped from '../../fixtures/tool-results/read-token-capped'
import { expect, test } from 'claude-code/testing'
import { engine, graphOf, nodeOf, start, turn } from './kit'

const read = ($: any, file_path: string) => $.tool.call({ tool: 'Read', file_path })

test('F01-AC1 whole read is read, "49 lines", tokens = ceil(length / 4), with turn bookkeeping', async ($, on) => {
  const answer = engine(on, readWhole)
  await start($)
  await turn($, 't1')
  await turn($, 't2')
  const out = await read($, '/w/src/auth/login.ts')
  expect(out).toEqual(answer)
  const n = await nodeOf('src/auth/login.ts')
  expect(n).toEqual({
    path: 'src/auth/login.ts', state: 'read', change: null, reason: null,
    tokens: Math.ceil(readWhole.result.file.content.length / 4), seen: '49 lines',
    hits: 0, added: 0, removed: 0, line: null, readId: expect.any(String), agents: [], mainLoop: true,
    firstTurn: 2, lastTurn: 2, touched: 1,
  })
  expect((await graphOf())?.seq).toBe(1)
})

test('F01-AC2 ranged read is partial, "lines 1 to 40 of 121"', async ($, on) => {
  engine(on, readRanged)
  await start($)
  await read($, '/w/src/routes/index.ts')
  const n = await nodeOf('src/routes/index.ts')
  expect(n?.state).toBe('partial')
  expect(n?.seen).toBe('lines 1 to 40 of 121')
})

test('F01-AC3 token-capped read is partial', async ($, on) => {
  engine(on, readTokenCapped)
  await start($)
  await read($, '/w/big.log')
  const n = await nodeOf('big.log')
  expect(n?.state).toBe('partial')
  expect(n?.seen).toBe('lines 1 to 636 of 2501')
})

test('F01-AC7 denied read leaves the graph unchanged and returns the errored result it received', async ($, on) => {
  engine(on, readWhole)
  on('classic.PreToolUse', () => ({ deny: 'no reads' }))
  await start($)
  const out = await read($, '/w/src/auth/login.ts')
  expect(out.isError).toBe(true)
  // The deny sits above the test's own hooks, so the errored result cannot be captured beneath the mod. A tool the mod
  // does not observe (Bash) under the same deny shows what a pass-through returns.
  expect(out).toStrictEqual(await $.tool.call({ tool: 'Bash', command: 'true' }))
  expect(await graphOf()).toBe(undefined)
})

test('F01-R8 an errored Read leaves the graph unchanged', async ($, on) => {
  const answer = engine(on, readWhole)
  Object.assign(answer, { isError: true, result: 'File does not exist.' })
  await start($)
  expect(await read($, '/w/src/auth/login.ts')).toStrictEqual(answer)
  expect(await graphOf()).toBe(undefined)
})

test('F01-AC10 /w/src/a.ts becomes src/a.ts, /etc/hosts stays absolute', async ($, on) => {
  engine(on, readWhole)
  await start($)
  await read($, '/w/src/a.ts')
  await read($, '/etc/hosts')
  expect(Object.keys((await graphOf())!.files).sort()).toEqual(['/etc/hosts', 'src/a.ts'])
})
