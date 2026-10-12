import subagents from '../../fixtures/sessions/subagents'
import { expect, test } from 'claude-code/testing'
import type { FileNode } from '../../types'
import { engine, graphOf, nodeOf, seedGraph, written, writes } from './kit'

// The recorded Explore agent (fixtures/sessions/subagents.ts) and the main loop's partial Read of login.ts (step 2).
const cwd = (subagents.events[0]!.input as any).cwd as string
const calls = subagents.events.filter(r => r.event === 'tool.call') as any[]
const pick = (tool: string, match: string, agent: boolean) =>
  calls.find(r => r.input.tool === tool && (r.input.file_path ?? r.input.command).includes(match) && !!r.input.agentId === agent)
const rg = pick('Bash', 'rg -n verify', true)
const agentReadPassword = pick('Read', 'password.ts', true)
const agentReadLogin = pick('Read', 'login.ts', true)
const mainReadLogin = pick('Read', 'login.ts', false)
const agentEdit = pick('Edit', 'login.ts', true)
const AGENT = rg.input.agentId as string

/** The mod, started in the recorded cwd, with the kit's bottom hooks; `call` raises a recorded row and the bottom hook answers its result. */
async function session($: any, on: any) {
  const answer = engine(on, { tool: '', tool_use_id: '', input: {}, result: null })
  on('session.surfaces', () => ({ value: [] })) // no surface: /graph answers its text
  on('command.register', () => ({ value: { command: 'graph' } }))
  on('prompt.mention', () => ({ type: 'file' })) // DERIVED: no recording, the type
  await $.session.start({ cwd, surface: null, isInteractive: false })
  const call = async (row: any, input: object = {}) => {
    Object.assign(answer, row.result)
    const out = await $.tool.call({ ...row.input, ...input })
    expect(out).toEqual(answer)
    return out
  }
  const meter = async () => (await $.command.run({ command: 'graph', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })).text.split('\n')[0]
  return { call, meter }
}

test('F15-AC1 a subagent reads password.ts: the node is subagent only and the meter line is unchanged', async ($, on) => {
  const { call, meter } = await session($, on)
  await call(mainReadLogin)
  const before = await meter()
  await call(agentReadPassword)
  expect(await nodeOf('src/auth/password.ts')).toMatchObject({ state: 'read', mainLoop: false, agents: [AGENT] })
  expect(await meter()).toBe(before)
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ mainLoop: true, agents: [] })
})

test('F15-AC3 a subagent edits login.ts: change edited, the agent id in agents (DERIVED: the recorded worktree Edit, its path moved to the repository)', async ($, on) => {
  const { call } = await session($, on)
  await call(agentEdit, { file_path: `${cwd}/src/auth/login.ts` })
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ change: 'edited', mainLoop: false, agents: [agentEdit.input.agentId] })
})

test('F15-R1 a subagent search makes subagent only search nodes', async ($, on) => {
  const { call } = await session($, on)
  await call(rg)
  const files = Object.values((await graphOf())!.files)
  expect(files.length).toBeGreaterThan(0)
  for (const n of files) expect(n).toMatchObject({ state: 'search', mainLoop: false, agents: [AGENT] })
})

test('F15-R1 a second call by the same agent does not repeat its id in agents', async ($, on) => {
  const { call } = await session($, on)
  await call(rg)
  await call(agentReadPassword)
  await call(agentReadLogin)
  expect((await nodeOf('src/auth/password.ts'))!.agents).toEqual([AGENT])
})

test('F15-R1 every subagent call is one write of graph and returns what the handler beneath returned', async ($, on) => {
  const { call } = await session($, on)
  await call(agentReadPassword)
  await call(rg)
  expect(writes.filter(k => k === 'graph')).toHaveLength(2)
})

// DERIVED: a main-loop call is a recorded agent row with its agentId removed.
const asMain = { agentId: undefined }

test('F15-AC2 a subagent reads password.ts, then the main loop does: it joins the meter and keeps the agent id (DERIVED: the main-loop row)', async ($, on) => {
  const { call, meter } = await session($, on)
  await call(agentReadPassword)
  const before = await meter()
  await call(agentReadPassword, asMain)
  expect(await nodeOf('src/auth/password.ts')).toMatchObject({ mainLoop: true, agents: [AGENT] })
  expect(await meter()).not.toBe(before)
})

test('F15-AC7 a compacted main-loop node read by a subagent stays compacted with its readId; the id is added (DERIVED: the seeded graph)', async ($, on) => {
  const compacted = { path: 'src/auth/login.ts', state: 'compacted', change: null, reason: null, tokens: 300, seen: '49 lines', hits: 0, added: 0, removed: 0,
    line: null, readId: 'toolu_main', agents: [], mainLoop: true, firstTurn: 0, lastTurn: 0, touched: 1 } satisfies FileNode
  seedGraph(on, { seq: 1, files: { [compacted.path]: compacted }, edges: [], decisions: [], compactions: [] })
  // The meter sums in-context nodes only (F03-R5), so a node that stays compacted leaves it unchanged; no /graph call here, it would consume the seed.
  const { call } = await session($, on)
  await call(agentReadLogin)
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ state: 'compacted', readId: 'toolu_main', tokens: 300, seen: '49 lines', agents: [AGENT], mainLoop: true })
})

test('F15-AC8 a subagent reads login.ts whole, then the main loop reads lines 1 to 40: partial with the main loop\'s tokens, seen and readId', async ($, on) => {
  const { call } = await session($, on)
  await call(agentReadLogin)
  const whole = (await nodeOf('src/auth/login.ts'))!
  expect(whole.state).toBe('read')
  await call(mainReadLogin)
  const n = (await nodeOf('src/auth/login.ts'))!
  expect(n).toMatchObject({ state: 'partial', mainLoop: true, agents: [AGENT], readId: mainReadLogin.input.tool_use_id })
  expect(n.tokens).toBeLessThan(whole.tokens!)
  expect(n.seen).not.toBe(whole.seen)
})

test('F15-R8 a subagent search of a main-loop read node leaves its hits and state; the id is added', async ($, on) => {
  const { call } = await session($, on)
  await call(agentReadLogin, asMain) // DERIVED: the main-loop row
  const before = (await nodeOf('src/auth/login.ts'))!
  await call(rg)
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ state: before.state, hits: before.hits, tokens: before.tokens, seen: before.seen, readId: before.readId, agents: [AGENT] })
})

test('F15-R8 a main-loop search of a subagent-only read node makes it search (DERIVED: the main-loop row)', async ($, on) => {
  const { call } = await session($, on)
  await call(agentReadLogin)
  await call(rg, asMain)
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ state: 'search', mainLoop: true, agents: [AGENT] })
})

test('F15-R8 a subagent-only edited node, then a main-loop read: read, still edited with its line counts (DERIVED: the moved Edit and the main-loop row)', async ($, on) => {
  const { call } = await session($, on)
  await call(agentEdit, { file_path: `${cwd}/src/auth/login.ts` })
  const edited = (await nodeOf('src/auth/login.ts'))!
  await call(agentReadLogin, asMain)
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({
    state: 'read', mainLoop: true, change: 'edited', added: edited.added, removed: edited.removed, line: edited.line, firstTurn: edited.firstTurn, agents: [agentEdit.input.agentId],
  })
})

test('F15-R8 a main-loop @-mention of a subagent-only node sizes it from the mention, not the agent (DERIVED: the mention result)', async ($, on) => {
  const { call } = await session($, on)
  await call(agentReadPassword)
  await $.prompt.mention({ mention: 'src/auth/password.ts', path: `${cwd}/src/auth/password.ts` })
  expect(await nodeOf('src/auth/password.ts')).toMatchObject({ state: 'read', tokens: null, seen: 'mentioned by you', mainLoop: true, agents: [AGENT] })
})

// F15-R4: the first call of an agent id asks `$.agent.list()` once; a hook beneath answers it and counts the calls.
const listed = (on: any, rows: object[]) => {
  const n = { calls: 0 }
  on('agent.list', () => (n.calls++, { value: rows }))
  return n
}
const exploreRow = (rg.agentListAtFirstCall as any[])[0]

test('F15-AC4 two reads by one agent call agent.list once and store its type and description', async ($, on) => {
  const list = listed(on, rg.agentListAtFirstCall)
  const { call } = await session($, on)
  await call(agentReadPassword)
  await call(agentReadLogin)
  expect(list.calls).toBe(1)
  expect(written.agents[AGENT]).toEqual({ id: AGENT, type: exploreRow.type, description: exploreRow.description })
})

test('F15-AC6 an agent the list does not name is stored as type agent, described by the first 8 characters of its id (DERIVED)', async ($, on) => {
  listed(on, [])
  const { call } = await session($, on)
  await call(agentReadPassword, { agentId: '7f3a9c21e0' })
  expect(written.agents['7f3a9c21e0']).toEqual({ id: '7f3a9c21e0', type: 'agent', description: '7f3a9c21' })
})

test('F15-R4 two calls of a new agent raised together call agent.list once', async ($, on) => {
  const list = listed(on, rg.agentListAtFirstCall)
  const { call } = await session($, on)
  await Promise.all([call(agentReadPassword), call(agentReadLogin)])
  expect(list.calls).toBe(1)
})

test('F15-R4 a main-loop call never calls agent.list', async ($, on) => {
  const list = listed(on, rg.agentListAtFirstCall)
  const { call } = await session($, on)
  await call(mainReadLogin)
  expect(list.calls).toBe(0)
  expect(writes).not.toContain('agents')
})

test('F15-R4 after a reload the list no longer names the agent: the stored name stays', async ($, on) => {
  const stored = { id: AGENT, type: 'Explore', description: 'Find uses of verify' }
  on('state.get', (_$: any, e: any, next: any) => (e.key === 'agents' ? { value: { value: { [AGENT]: stored }, version: 0 } } : next(e)))
  listed(on, [])
  const { call } = await session($, on)
  await call(agentReadPassword)
  expect(written.agents[AGENT]).toEqual(stored)
})

// F15-R9: the recorded worktree agent (step 3). Its Read and Edit paths are under <cwd>/.claude/worktrees/agent-<id>/.
const wtAgent = agentEdit.input.agentId as string
const wtName = `agent-${wtAgent}`
const wtRows = calls.filter(r => r.input.agentId === wtAgent)
const wtRead = wtRows.find(r => r.input.tool === 'Read')
const wtRg = wtRows.find(r => r.input.tool === 'Bash')

test('F15-AC9 a subagent reads a file in its worktree: the node is the repository\'s path (DERIVED: /w/.claude/worktrees/agent-a1/src/a.ts)', async ($, on) => {
  const { call } = await session($, on)
  await call(agentReadPassword, { file_path: `${cwd}/.claude/worktrees/agent-a1/src/auth/password.ts` })
  expect(Object.keys((await graphOf())!.files)).toEqual(['src/auth/password.ts'])
})

test('F15-AC10 a subagent edits in its worktree: edited, reason says the worktree (the recorded Edit)', async ($, on) => {
  const { call } = await session($, on)
  await call(agentEdit)
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ change: 'edited', reason: `in worktree ${wtName}`, mainLoop: false })
})

test('F15-R9 the recorded worktree agent\'s Read, rg and Edit of login.ts make one node and no .claude/worktrees node', async ($, on) => {
  const { call } = await session($, on)
  await call(wtRg)
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ state: 'search' }) // the rg hit lands on the repository's row
  for (const row of [wtRead, agentEdit]) await call(row)
  const files = Object.keys((await graphOf())!.files)
  expect(files).toContain('src/auth/login.ts')
  expect(files.filter(p => p.includes('.claude'))).toEqual([])
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ change: 'edited', agents: [wtAgent] })
})

test('F15-R9 a later main-loop edit sets reason back to null (DERIVED: the recorded Edit as a main-loop row)', async ($, on) => {
  const { call } = await session($, on)
  await call(agentEdit)
  await call(agentEdit, { agentId: undefined, file_path: `${cwd}/src/auth/login.ts` })
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ change: 'edited', reason: null })
})
