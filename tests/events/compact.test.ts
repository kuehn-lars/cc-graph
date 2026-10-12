import readWhole from '../../fixtures/tool-results/read-whole'
import reference from '../../fixtures/sessions/reference'
import { expect, test } from 'claude-code/testing'
import type { FileNode, Graph } from '../../types'
import { engine, graphOf, nodeOf, seedGraph, start, writes } from './kit'

// The recorded session.compact result (fixtures/sessions/reference.ts) keeps no tool use and holds tokensBefore 22694.
const recorded = reference.events.find(e => e.event === 'session.compact')!.result as any
const noToolUse = recorded.messages.map((m: any) => ({ ...m, handle: undefined }))
// DERIVED: the recorded result shape, with a kept assistant message that holds tool uses.
const keeping = (...ids: string[]) => [...noToolUse, { role: 'assistant', text: '', toolUses: ids.map(tool_use_id => ({ tool_use_id, tool: 'Read', input: {} })) }]

const node = (path: string, over: Partial<FileNode>): FileNode => ({
  path, state: 'read', change: null, reason: null, tokens: 100, seen: '49 lines', hits: 0, added: 0, removed: 0,
  line: null, readId: 'toolu_01', agents: [], mainLoop: true, firstTurn: 0, lastTurn: 0, touched: 1, ...over,
})
const graphWith = (...nodes: FileNode[]): Graph => ({
  seq: nodes.length, files: Object.fromEntries(nodes.map(n => [n.path, n])), edges: [], decisions: [], compactions: [],
})
const states = async () => Object.fromEntries(Object.entries((await graphOf())!.files).map(([p, n]) => [p, n.state]))

/** The bottom `session.compact` hook answers `result`; the mod's graph starts as `graph`, at turn 3. */
async function compact($: any, on: any, graph: Graph, result: any, input: object = {}) {
  engine(on, { tool: '', tool_use_id: '', input: {}, result: null }) // the kit's session.start, and the record of state.set
  const seeds: Record<string, unknown> = { graph, turn: 3 }
  on('state.get', (_$: any, e: any, next: any) => (e.key in seeds ? { value: { value: seeds[e.key], version: 0 } } : next(e)))
  on('session.compact', () => result)
  await start($)
  return $.session.compact({ trigger: 'manual', messages: noToolUse, ...input })
}

const three = graphWith(
  node('src/a.ts', {}), node('src/b.ts', { state: 'partial', readId: 'toolu_02' }),
  node('src/c.ts', { change: 'edited', reason: 'edited', readId: 'toolu_03' }),
)

test('F03-AC1 two read nodes and one edited node all become compacted; the edited one keeps change: edited', async ($, on) => {
  const out = { messages: noToolUse }
  expect(await compact($, on, three, out)).toEqual(out)
  expect(await states()).toEqual({ 'src/a.ts': 'compacted', 'src/b.ts': 'compacted', 'src/c.ts': 'compacted' })
  expect(await nodeOf('src/c.ts')).toMatchObject({ change: 'edited', reason: 'edited' })
  // One compaction, one write of graph.
  expect(writes.filter(k => k === 'graph')).toHaveLength(1)
})

test('F03-AC2 a compaction with agentId changes no node (DERIVED: the type, no recording has one)', async ($, on) => {
  const out = { messages: noToolUse }
  expect(await compact($, on, three, out, { agentId: 'agent_1' })).toEqual(out)
  expect(writes).not.toContain('graph')
})

test('F03-AC3 a compaction answered { skip } changes no node (DERIVED: the type)', async ($, on) => {
  const out = { skip: 'test' }
  expect(await compact($, on, three, out)).toEqual(out)
  expect(writes).not.toContain('graph')
})

test('F03-AC4 a compacted node read whole again is read', async ($, on) => {
  seedGraph(on, graphWith(node('src/auth/login.ts', { state: 'compacted' })))
  engine(on, { tool: 'Read', tool_use_id: 'x', input: {}, result: readWhole.result })
  await start($)
  await $.tool.call({ tool: 'Read', file_path: '/w/src/auth/login.ts' })
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ state: 'read' })
})

test('F03-AC6 a precompute compaction changes no node', async ($, on) => {
  const out = { messages: noToolUse }
  expect(await compact($, on, three, out, { trigger: 'precompute' })).toEqual(out)
  expect(writes).not.toContain('graph')
})

test('F03-AC7 tokensBefore 496862 and tokensAfter 20125 give one mark with those numbers (DERIVED figures)', async ($, on) => {
  await compact($, on, three, { messages: noToolUse, tokensBefore: 496862, tokensAfter: 20125 }, { trigger: 'auto' })
  expect((await graphOf())!.compactions).toEqual([{ turn: 3, trigger: 'auto', tokensBefore: 496862, tokensAfter: 20125, kept: 0 }])
})

test('F03-AC7 absent figures are stored as null', async ($, on) => {
  await compact($, on, three, { messages: noToolUse })
  expect((await graphOf())!.compactions[0]).toMatchObject({ tokensBefore: null, tokensAfter: null })
})

test('F03-AC9 with toolu_02 kept, src/b.ts stays read, src/a.ts is compacted, the mark has kept: 1 (DERIVED: a kept tool use)', async ($, on) => {
  await compact($, on, graphWith(node('src/a.ts', {}), node('src/b.ts', { readId: 'toolu_02' })), { messages: keeping('toolu_02') })
  expect(await states()).toEqual({ 'src/a.ts': 'compacted', 'src/b.ts': 'read' })
  expect((await graphOf())!.compactions[0]!.kept).toBe(1)
})

test('F03-R1 a search node whose latest call is kept stays search; ghost and unread nodes are untouched; a node outside the main loop is left alone', async ($, on) => {
  await compact($, on, graphWith(
    node('src/s.ts', { state: 'search', readId: 'toolu_s' }), node('src/t.ts', { state: 'search', readId: 'toolu_t' }),
    node('src/g.ts', { state: 'ghost', readId: null }), node('src/u.ts', { state: 'unread', readId: null }),
    node('src/o.ts', { mainLoop: false, agents: ['a1'] }),
  ), { messages: keeping('toolu_s') })
  expect(await states()).toEqual({
    'src/s.ts': 'search', 'src/t.ts': 'compacted', 'src/g.ts': 'ghost', 'src/u.ts': 'unread', 'src/o.ts': 'read',
  })
})
