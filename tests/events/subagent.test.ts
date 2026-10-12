import subagents from '../../fixtures/sessions/subagents'
import { expect, test } from 'claude-code/testing'
import { engine, graphOf, nodeOf, start, writes } from './kit'

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
