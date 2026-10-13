import readWhole from '../../fixtures/tool-results/read-whole'
import reference from '../../fixtures/sessions/reference'
import { expect, test } from 'claude-code/testing'
import { engine, graphOf, start, writes } from './kit'

const read = ($: any, file_path: string) => $.tool.call({ tool: 'Read', file_path })
const login = '/w/src/auth/login.ts'
const edgesOf = async () => (await graphOf())!.edges

test('F06-AC1 reading login.ts links password.ts and sessions.ts: guessed edges, ghost targets', async ($, on) => {
  engine(on, readWhole)
  await start($)
  await read($, login)
  expect(await edgesOf()).toEqual([
    { from: 'src/auth/login.ts', to: 'src/auth/password.ts', kind: 'import', blind: false, guessed: true },
    { from: 'src/auth/login.ts', to: 'src/auth/sessions.ts', kind: 'import', blind: false, guessed: true },
  ])
  const files = (await graphOf())!.files
  expect(files['src/auth/password.ts']).toMatchObject({ state: 'ghost', tokens: null })
  expect(files['src/auth/sessions.ts']).toMatchObject({ state: 'ghost' })
  expect(files['src/auth/login.ts']).toMatchObject({ state: 'read' })
})

test('F06-AC10 reading login.ts twice still leaves one edge to password.ts', async ($, on) => {
  engine(on, readWhole)
  await start($)
  await read($, login)
  await read($, login)
  expect((await edgesOf()).filter(e => e.to === 'src/auth/password.ts')).toHaveLength(1)
  expect(await edgesOf()).toHaveLength(2)
})

test('F06-R10 a file importing itself adds no edge', async ($, on) => {
  engine(on, { ...readWhole, result: { ...readWhole.result, file: { ...readWhole.result.file, content: "import { x } from './login'\nimport './login.ts'" } } })
  await start($)
  await read($, login)
  expect(await edgesOf()).toEqual([])
  expect(Object.keys((await graphOf())!.files)).toEqual(['src/auth/login.ts'])
})

test('F06-R10 a target that is already a read node keeps its state', async ($, on) => {
  const answer = engine(on, readWhole)
  await start($)
  await read($, '/w/src/auth/password.ts') // the recorded result is login.ts's text; only the node matters here
  answer.result = readWhole.result
  await read($, login)
  expect((await graphOf())!.files['src/auth/password.ts']).toMatchObject({ state: 'read' })
})

test('F06-R1 one update of graph per call: the node, its edges and its ghosts land together (I9)', async ($, on) => {
  engine(on, readWhole)
  await start($)
  await read($, login)
  expect(writes.filter(k => k === 'graph')).toHaveLength(1)
})

test('F06-R1 the call returns what the handler beneath returned', async ($, on) => {
  const answer = engine(on, readWhole)
  await start($)
  expect(await read($, login)).toEqual(answer)
})

// F06-AC4, F06-R8: `check-calls.mjs` holds the allowlist (no `$.fs`); this proves a read of the file asks for nothing but the tool call.
test('F06-AC4 reading a file with imports makes no fs call', async ($, on) => {
  engine(on, readWhole)
  const seen: string[] = []
  for (const ev of ['fs.read', 'fs.write', 'fs.list', 'fs.exists', 'fs.stat', 'fs.ancestors'] as const) on(ev, (_$: any, e: any, next: any) => (seen.push(ev), next(e)))
  await start($)
  await read($, login)
  expect(seen).toEqual([])
})

// The recorded Write of rateLimit.ts (step 6) and Edit of login.ts (step 8) in the reference session.
const recorded = (step: number) => {
  const row = reference.events.find(c => c.event === 'tool.call' && c.process === 1 && c.step === step)!
  return { tool: row.input.tool, tool_use_id: row.input.tool_use_id, input: row.input, result: row.result.result } as any
}
const write = recorded(6)
const edit = recorded(8)

test('F06-AC8 the recorded Edit of login.ts that adds ../middleware/rateLimit links to rateLimit.ts', async ($, on) => {
  engine(on, edit)
  await start($)
  await $.tool.call({ ...edit.input, file_path: '/w/src/auth/login.ts' })
  expect(await edgesOf()).toContainEqual({ from: 'src/auth/login.ts', to: 'src/middleware/rateLimit.ts', kind: 'import', blind: false, guessed: true })
  expect((await graphOf())!.files['src/middleware/rateLimit.ts']).toMatchObject({ state: 'ghost' })
})

test('F06-AC2 the recorded Write of rateLimit.ts adds no edge and no node for rate-limiter-flexible', async ($, on) => {
  engine(on, write)
  await start($)
  await $.tool.call({ ...write.input, file_path: '/w/src/middleware/rateLimit.ts' })
  expect(await edgesOf()).toEqual([])
  expect(Object.keys((await graphOf())!.files)).toEqual(['src/middleware/rateLimit.ts'])
})

test('F06-AC5 (derived) a 300,000-character Read result adds no edge', async ($, on) => {
  const content = "import './password'\n" + 'x'.repeat(300_000)
  engine(on, { ...readWhole, result: { ...readWhole.result, file: { ...readWhole.result.file, content } } })
  await start($)
  await read($, login)
  expect(await edgesOf()).toEqual([])
})

const big = "import './password'\n" + 'x'.repeat(200_000) // 200,019 characters

test('F06-R9 a Write over 200,000 characters adds no edge', async ($, on) => {
  engine(on, { ...write, result: { ...write.result, content: big } })
  await start($)
  await $.tool.call({ ...write.input, file_path: login })
  expect(await edgesOf()).toEqual([])
})

test('F06-R9 an Edit over 200,000 characters adds no edge', async ($, on) => {
  engine(on, { ...edit, result: { ...edit.result, newString: big } })
  await start($)
  await $.tool.call({ ...edit.input, file_path: login })
  expect(await edgesOf()).toEqual([])
})

test('F06-R9 a Write of exactly 200,000 characters is still parsed', async ($, on) => {
  const content = "import './password'\n".padEnd(200_000, 'x')
  engine(on, { ...write, result: { ...write.result, content } })
  await start($)
  await $.tool.call({ ...write.input, file_path: login })
  expect(await edgesOf()).toHaveLength(1)
})
