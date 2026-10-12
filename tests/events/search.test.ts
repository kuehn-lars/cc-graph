import readWhole from '../../fixtures/tool-results/read-whole'
import out from '../../fixtures/output/outputs'
import reference from '../../fixtures/sessions/reference'
import { expect, test } from 'claude-code/testing'
import type { FileNode } from '../../types'
import { engine, graphOf, nodeOf, seedGraph, start, toolIds, writes } from './kit'

// A Bash result as the sessions record it (fixtures/sessions/reference.ts, step 3).
const recorded = reference.events.find(e => e.event === 'tool.call' && (e.input as any).command?.startsWith('rg -n'))!
const bashResult = (stdout: string, over: object = {}) => ({ ...(recorded.result as any).result, stdout, ...over })

const bash = ($: any, command: string) => $.tool.call({ tool: 'Bash', command })
const read = ($: any, file_path: string) => $.tool.call({ tool: 'Read', file_path })

/** The kit's bottom hooks, answering Bash with `stdout`. */
function setup(on: any, stdout: string, over: object = {}) {
  const answer = engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: bashResult(stdout, over) })
  return { answer, seen: { ids: toolIds, get writes() { return writes.filter(k => k === 'graph').length } } }
}

const rgN = out['rg-n-verify-src-auth']
const compacted = (path: string, hits: number): FileNode => ({
  path, state: 'compacted', change: null, reason: null, tokens: 414, seen: '49 lines', hits, added: 0, removed: 0,
  line: null, readId: 'toolu_seed', agents: [], mainLoop: true, firstTurn: 0, lastTurn: 0, touched: 5,
})

test('F02-AC1 two hit lines in password.ts give one search node, hits 2, "2 search hits, never opened"', async ($, on) => {
  const { answer, seen } = setup(on, rgN.stdout)
  await start($)
  expect(await bash($, rgN.command)).toEqual(answer)
  expect(await nodeOf('src/auth/password.ts')).toEqual({
    path: 'src/auth/password.ts', state: 'search', change: null, reason: null,
    tokens: Math.ceil(221 / 4), seen: '2 search hits, never opened',
    hits: 2, added: 0, removed: 0, line: null, readId: seen.ids[0], agents: [], mainLoop: true,
    firstTurn: 0, lastTurn: 0, touched: 1,
  })
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ state: 'search', hits: 2, tokens: Math.ceil(159 / 4), touched: 2 })
  // One call, one write, however many files it hits.
  expect(seen.writes).toBe(1)
  expect((await graphOf())?.seq).toBe(2)
})

test('F02-AC2 a read node hit by a search stays read, keeps tokens, seen and readId, and its hits grow', async ($, on) => {
  const { answer } = setup(on, rgN.stdout)
  answer.result = readWhole.result as any
  await start($)
  await read($, '/w/src/auth/login.ts')
  const before = await nodeOf('src/auth/login.ts')
  answer.result = bashResult(rgN.stdout)
  await bash($, rgN.command)
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({
    state: 'read', hits: 2, tokens: before!.tokens, seen: '49 lines', readId: before!.readId,
  })
  await bash($, rgN.command)
  expect((await nodeOf('src/auth/login.ts'))!.hits).toBe(4)
})

test('F02-AC4 npm test output holding src/a.ts:3 changes nothing (DERIVED: no real successful command prints that line)', async ($, on) => {
  const { answer } = setup(on, 'src/a.ts:3\n')
  await start($)
  expect(await bash($, 'npm test')).toEqual(answer)
  expect(await graphOf()).toBe(undefined)
})

test('F02-AC6 git grep -n hits are counted as for rg -n', async ($, on) => {
  const { answer } = setup(on, out['git-grep-n-verify'].stdout)
  await start($)
  expect(await bash($, out['git-grep-n-verify'].command)).toEqual(answer)
  expect(await nodeOf('src/auth/password.ts')).toMatchObject({ state: 'search', hits: 2, seen: '2 search hits, never opened' })
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ state: 'search', hits: 2 })
})

test('F02-AC6 grep -rn hits are counted as for rg -n', async ($, on) => {
  setup(on, out['grep-rn-verify-src'].stdout)
  await start($)
  await bash($, out['grep-rn-verify-src'].command)
  expect(await nodeOf('src/auth/password.ts')).toMatchObject({ state: 'search', hits: 2 })
})

// Only F03 produces `compacted`, so the graph is seeded: the first read of `graph` answers a graph holding the node.
test('F02-AC7 a compacted node hit by a search becomes search', async ($, on) => {
  setup(on, rgN.stdout)
  seedGraph(on, { seq: 5, files: { 'src/auth/login.ts': compacted('src/auth/login.ts', 0) }, edges: [], decisions: [], compactions: [] })
  await start($)
  await bash($, rgN.command)
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ state: 'search', hits: 2 })
})

test('F02-AC13 the same search run twice over a search node gives hits 4, twice the tokens, and the second readId', async ($, on) => {
  const { seen } = setup(on, rgN.stdout)
  await start($)
  await bash($, rgN.command)
  const first = await nodeOf('src/auth/password.ts')
  await bash($, rgN.command)
  const n = await nodeOf('src/auth/password.ts')
  expect(seen.ids).toHaveLength(2)
  expect(seen.ids[1]).not.toBe(seen.ids[0])
  expect(n).toMatchObject({ state: 'search', hits: 4, tokens: first!.tokens! * 2, readId: seen.ids[1], seen: '4 search hits, never opened' })
})

test('F02-AC14 a compacted node with 5 hits, hit twice, is search with hits 2 and "2 search hits since compaction"', async ($, on) => {
  const { seen } = setup(on, rgN.stdout)
  seedGraph(on, { seq: 5, files: { 'src/auth/login.ts': compacted('src/auth/login.ts', 5) }, edges: [], decisions: [], compactions: [] })
  await start($)
  await bash($, rgN.command)
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({
    state: 'search', hits: 2, tokens: Math.ceil(159 / 4), seen: '2 search hits since compaction', readId: seen.ids[0],
  })
  await bash($, rgN.command)
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ hits: 4, seen: '4 search hits since compaction' })
})

// DERIVED: the recorded result with `interrupted: true`; no session returns one by itself.
test('F02-AC12 a search whose result has interrupted: true changes nothing', async ($, on) => {
  const { answer } = setup(on, rgN.stdout, { interrupted: true })
  await start($)
  expect(await bash($, rgN.command)).toStrictEqual(answer)
  expect(await graphOf()).toBe(undefined)
})

// DERIVED: an errored Bash result is the type's, not a recording (as F01-R8).
test('F02-R7 an errored search changes nothing and returns what the handler beneath returned', async ($, on) => {
  const { answer } = setup(on, rgN.stdout)
  Object.assign(answer, { isError: true, result: 'rg: src/nowhere: No such file or directory (os error 2)' })
  await start($)
  expect(await bash($, rgN.command)).toStrictEqual(answer)
  expect(await graphOf()).toBe(undefined)
})

// Ticket 02: searches inside pipelines and chains.
// DERIVED: the sample app has no `lint` script, so the stdout is the captured `rg -n verify src | head -20`.
test('F02-AC5 npm run lint && rg -n verify src | head -20 counts the hits in the output', async ($, on) => {
  const head = out['rg-n-verify-src-head']
  const { answer } = setup(on, head.stdout)
  await start($)
  expect(await bash($, `npm run lint && ${head.command}`)).toEqual(answer)
  expect(await nodeOf('src/auth/password.ts')).toMatchObject({ state: 'search', hits: 2, seen: '2 search hits, never opened' })
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ state: 'search', hits: 2 })
})

test('F02-AC11 cat log.txt | rg -n error changes nothing', async ($, on) => {
  const log = out['cat-log-rg-n-error']
  const { answer } = setup(on, log.stdout)
  await start($)
  expect(await bash($, log.command)).toEqual(answer)
  expect(await graphOf()).toBe(undefined)
})

// DERIVED: a standard-input search whose output looks like hits; no real run prints path lines for stdin.
test('F02-R3 a search reading standard input adds nothing even when its output looks like hits', async ($, on) => {
  setup(on, 'src/a.ts:3:x\n')
  await start($)
  await bash($, 'cat log.txt | rg -n x')
  expect(await graphOf()).toBe(undefined)
})

// Ticket 04: hits under cd. The stdout is the capture run in src (`rg -n verify auth` with cwd src), which is what
// `cd src && rg -n verify auth` prints; the compound commands are composed from the capture's command.
const inSrc = out['rg-n-verify-auth-in-src']

test('F02-AC8 cd src && rg -n verify auth gives src/auth/password.ts', async ($, on) => {
  const { answer } = setup(on, inSrc.stdout)
  await start($)
  expect(await bash($, `cd src && ${inSrc.command}`)).toEqual(answer)
  expect(await nodeOf('src/auth/password.ts')).toMatchObject({ state: 'search', hits: 2, seen: '2 search hits, never opened' })
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ state: 'search', hits: 2 })
  expect((await graphOf())!.files['auth/login.ts']).toBe(undefined)
})

test('F02-R8 an absolute cd inside the working directory gives the same nodes', async ($, on) => {
  setup(on, inSrc.stdout)
  await start($)
  await bash($, `cd /w/src && ${inSrc.command}`)
  expect(await nodeOf('src/auth/password.ts')).toMatchObject({ state: 'search', hits: 2 })
})

test('F02-R8 an absolute cd outside the working directory keeps absolute paths', async ($, on) => {
  setup(on, inSrc.stdout)
  await start($)
  await bash($, `cd /elsewhere && ${inSrc.command}`)
  expect(await nodeOf('/elsewhere/auth/password.ts')).toMatchObject({ state: 'search', hits: 2 })
})

test('F02-R8 two cds in a row join', async ($, on) => {
  setup(on, 'login.ts:2:x\n')
  await start($)
  await bash($, 'cd src && cd auth && rg -n x .')
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ state: 'search', hits: 1 })
})

// DERIVED: the capture's stdout under commands whose directory cannot be known; no run of them is recorded.
for (const command of [`cd $DIR && ${inSrc.command}`, `cd - && ${inSrc.command}`, `(cd src && ${inSrc.command})`])
  test(`F02-R8 a search after an unknown directory changes nothing: ${command}`, async ($, on) => {
    const { answer } = setup(on, inSrc.stdout)
    await start($)
    expect(await bash($, command)).toEqual(answer)
    expect(await graphOf()).toBe(undefined)
  })
