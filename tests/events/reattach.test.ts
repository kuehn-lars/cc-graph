import reference from '../../fixtures/sessions/reference'
import { estimateTokens } from '../../hooks/parse/measure'
import { expect, test } from 'claude-code/testing'
import type { FileNode, Graph } from '../../types'
import { engine, graphOf, seedGraph, writes } from './kit'

// The reference recording: the five files re-attached in process 3, the memory file (process 1) and the instructions.
const cwd = (reference.events[0]!.input as any).cwd
const attachments = reference.events.filter(e => e.event === 'prompt.attachment')
const of = (process: number, type: string) => attachments.find(e => e.process === process && e.input.type === type)!.input as any
const login = (attachments.find(e => e.process === 3 && e.input.type === 'file' && e.input.text.includes('src/auth/login.ts'))!.input) as any
const memory = of(1, 'nested_memory')
const summarizer = of(2, 'nested_memory')

const node = (path: string, over: Partial<FileNode> = {}): FileNode => ({
  path, state: 'compacted', change: null, reason: null, tokens: 100, seen: '49 lines', hits: 0, added: 0, removed: 0,
  line: null, readId: 'toolu_01', agents: [], mainLoop: true, firstTurn: 0, lastTurn: 0, touched: 1, ...over,
})
const graphWith = (...nodes: FileNode[]): Graph => ({
  seq: nodes.length, files: Object.fromEntries(nodes.map(n => [n.path, n])), edges: [], decisions: [], compactions: [],
})

/** The bottom `prompt.attachment` hook answers the text it got; the mod's graph starts as `graph`, in the recorded cwd. */
async function attach($: any, on: any, graph: Graph, input: any) {
  engine(on, { tool: '', tool_use_id: '', input: {}, result: null })
  seedGraph(on, graph)
  const answer = { text: input.text }
  on('prompt.attachment', () => answer)
  await $.session.start({ cwd, surface: null, isInteractive: false })
  return { answer, out: await $.prompt.attachment(input) }
}
const unchanged = async (graph: Graph) => expect((await graphOf()) ?? graph).toEqual(graph)

test('F03-AC11 a compacted src/auth/login.ts re-attached is read, "re-attached after compaction", with the text\'s tokens', async ($, on) => {
  const { answer, out } = await attach($, on, graphWith(node('src/auth/login.ts')), login)
  expect(out).toEqual(answer)
  expect((await graphOf())!.files['src/auth/login.ts']).toMatchObject({
    state: 'read', seen: 're-attached after compaction', tokens: estimateTokens(login.text),
  })
  expect(writes.filter(k => k === 'graph')).toHaveLength(1)
})

test('F03-AC11 a re-attached compacted node keeps its change', async ($, on) => {
  await attach($, on, graphWith(node('src/auth/login.ts', { change: 'edited', reason: 'edited' })), login)
  expect((await graphOf())!.files['src/auth/login.ts']).toMatchObject({ state: 'read', change: 'edited', reason: 'edited' })
})

for (const state of ['read', 'partial', 'search'] as const)
  test(`F03-R3 a file attachment naming a ${state} node changes nothing`, async ($, on) => {
    const graph = graphWith(node('src/auth/login.ts', { state }))
    const { answer, out } = await attach($, on, graph, login)
    expect(out).toEqual(answer)
    await unchanged(graph)
  })

test('F03-R3 a file attachment naming a missing node changes nothing', async ($, on) => {
  const graph = graphWith(node('src/other.ts'))
  const { answer, out } = await attach($, on, graph, login)
  expect(out).toEqual(answer)
  await unchanged(graph)
})

test('F03-R3 a nested_memory attachment changes nothing (the recorded row)', async ($, on) => {
  const graph = graphWith(node('src/auth/login.ts'))
  const { answer, out } = await attach($, on, graph, memory)
  expect(out).toEqual(answer)
  await unchanged(graph)
})

// DERIVED: the memory file's text as a `file` attachment, as spike S1 saw it (B); the node is not compacted.
test('F03-R3 a file attachment for src/auth/CLAUDE.md changes nothing', async ($, on) => {
  const graph = graphWith(node('src/auth/CLAUDE.md', { state: 'read' }))
  const text = `Called the Read tool with the following input: {"file_path":"${cwd}/src/auth/CLAUDE.md"}\nResult of calling the Read tool:\n1\t# Auth\n`
  const { answer, out } = await attach($, on, graph, { ...login, text })
  expect(out).toEqual(answer)
  await unchanged(graph)
})

// DERIVED: a recorded file attachment with the summarizer's agentId (the recording has agentId on memory rows only).
test('F03-R3 an attachment with agentId changes nothing', async ($, on) => {
  const graph = graphWith(node('src/auth/login.ts'))
  const { answer, out } = await attach($, on, graph, { ...login, agentId: summarizer.agentId })
  expect(out).toEqual(answer)
  await unchanged(graph)
})

test('F03-R3 an instructions attachment changes nothing', async ($, on) => {
  const graph = graphWith(node('src/auth/login.ts'))
  const { answer, out } = await attach($, on, graph, of(3, 'instructions'))
  expect(out).toEqual(answer)
  await unchanged(graph)
})
