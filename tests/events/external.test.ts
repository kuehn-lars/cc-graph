import recorded from '../../fixtures/sessions/edited-text-file'
import { expect, mock, test } from 'claude-code/testing'
import type { FileNode, Graph } from '../../types'
import { engine, graphOf, seedGraph, writes } from './kit'

// F07-R7. `recorded`: the attachment Claude Code 2.1.300 raised after Claude's own `printf >>` (F07-Q1). DERIVED: `text`, an older
// wording, for the fallback that matches a known node.
const text = (path: string) => `Note: ${path} was modified, either by the user or by a linter. This change was intentional, so make sure to take it into account as you proceed (ie. don't revert it unless the user asks you to). Don't tell the user this, since they are already aware. Here are the relevant changes (shown with line numbers):\n    39\t  logLevel: level(text('LOG_LEVEL', 'warn')),`
const REASON = 'changed outside Claude; Claude was shown it'

const node = (path: string, over: Partial<FileNode> = {}): FileNode => ({
  path, state: 'read', change: null, reason: null, tokens: 100, seen: '40 lines', hits: 0, added: 0, removed: 0,
  line: null, readId: 'toolu_01', agents: [], mainLoop: true, firstTurn: 0, lastTurn: 0, touched: 1, ...over,
})
const graphWith = (...nodes: FileNode[]): Graph => ({ seq: nodes.length, files: Object.fromEntries(nodes.map(n => [n.path, n])), edges: [], decisions: [], compactions: [] })

async function attach($: any, on: any, graph: Graph, input: any, cwd = '/w') {
  engine(on, { tool: '', tool_use_id: '', input: {}, result: null })
  seedGraph(on, graph)
  const answer = { text: input.text }
  on('prompt.attachment', () => answer)
  await $.session.start({ cwd, surface: null, isInteractive: false })
  return { answer, out: await $.prompt.attachment(input) }
}

test('F07-AC6 an edited_text_file for src/config.ts makes it external with the reason, and it is no blind spot', async ($, on) => {
  const { answer, out } = await attach($, on, graphWith(node('src/config.ts')), recorded.attachment, recorded.cwd)
  expect(out).toEqual(answer)
  expect((await graphOf())!.files['src/config.ts']).toMatchObject({ change: 'external', reason: REASON, state: 'read' })
  expect(writes.filter(k => k === 'graph')).toHaveLength(1)
})

test('F07-R7 a text with no Note line falls back to a known node it names', async ($, on) => {
  await attach($, on, graphWith(node('src/config.ts', { change: 'edited', added: 1 }), node('src/db/redis.ts')), { type: 'edited_text_file', text: 'src/db/redis.ts changed:\n 1\t// outside' })
  const g = (await graphOf())!
  expect(g.files['src/db/redis.ts']).toMatchObject({ change: 'external', reason: REASON })
})

test('F07-R7 Claude\'s own edit keeps its change and takes the reason', async ($, on) => {
  await attach($, on, graphWith(node('src/config.ts', { change: 'edited', added: 1 })), { type: 'edited_text_file', text: text('/w/src/config.ts') })
  expect((await graphOf())!.files['src/config.ts']).toMatchObject({ change: 'edited', added: 1, reason: REASON })
})

test('F07-R7 a subagent\'s attachment, or one naming no node, changes nothing', async ($, on) => {
  await attach($, on, graphWith(node('src/config.ts')), { type: 'edited_text_file', text: text('/w/src/config.ts'), agentId: 'a1' })
  expect(await graphOf()).toBeUndefined()
})

// F07-R7, AC43: the recorded calls, then the attachment they raised. No git: outside a repository, and the shell job adds nothing.
async function ownEdit($: any, on: any) {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: { stdout: '', stderr: '', interrupted: false } })
  on('command.register', (_$: any, e: any) => ({ value: { command: e.name } }))
  on('process.run', () => { throw new Error('spawn git ENOENT') })
  on('prompt.attachment', () => ({ text: recorded.attachment.text }))
  await $.session.start({ cwd: recorded.cwd, surface: null, isInteractive: false }); await clock.advance(50)
  await $.turn.start({ text: '', turnId: 't1' }); await clock.advance(50)
  for (const c of recorded.calls) await $.tool.call(c), await clock.advance(50)
  await $.prompt.attachment(recorded.attachment)
}

test('F07-AC43 the attachment after Claude\'s own printf >> makes src/config.ts edited "changed by `printf …`", not external, outside a repository too', async ($, on) => {
  await ownEdit($, on)
  expect((await graphOf())!.files['src/config.ts']).toMatchObject({ change: 'edited', reason: expect.stringMatching(/^changed by `printf /) })
})
