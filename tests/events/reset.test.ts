import { expect, test } from 'claude-code/testing'
import type { Graph } from '../../types'
import { node } from '../ui/kit'
import { written, writes } from './kit'

// Everything the mod holds when a conversation is mid-way: a graph with a node, turn 4, a selection, view 'graph'.
const graph: Graph = { seq: 1, files: { 'a.ts': node('a.ts', 1) }, edges: [], decisions: [], compactions: [] }
const held: Record<string, unknown> = { graph, turn: 4, selected: 'a.ts', view: 'graph', agents: { ag1: { id: 'ag1', type: 'Explore', description: 'x' } } }
const canary = { stopReason: 'unknown to every hook' }

/** The test's bottom hooks: `state.get` answers `held`, `classic.SessionStart` answers `canary`, `state.set` is recorded. */
function setup(on: any) {
  for (const k of Object.keys(written)) delete written[k]
  writes.length = 0
  on('state.get', (_$: any, e: any) => ({ value: { value: held[e.key], version: 0 } }))
  on('state.set', (_$: any, e: any, next: any) => ((written[e.key] = e.value), writes.push(e.key), next(e)))
  on('classic.SessionStart', () => canary)
}

const emptyGraph = { seq: 0, files: {}, edges: [], decisions: [], compactions: [] }

test('F03-AC8 a graph with nodes and view graph, then source clear: the graph is empty and view is still graph', async ($, on) => {
  setup(on)
  await $.classic.SessionStart({ source: 'clear' })
  expect(written.graph).toEqual(emptyGraph)
  expect(writes).not.toContain('view')
})

for (const source of ['resume', 'fork'] as const) {
  test(`F03-AC8 source ${source} empties graph, turn, selected, fill, agents, memory and notes, and leaves view`, async ($, on) => {
    setup(on)
    await $.classic.SessionStart({ source })
    expect(written).toEqual({ graph: emptyGraph, turn: 0, selected: null, fill: null, agents: {}, memory: [], notes: [] })
    expect(writes).toEqual(['graph', 'turn', 'selected', 'fill', 'agents', 'memory', 'notes'])
  })
}

for (const source of ['compact', 'startup'] as const) {
  test(`F03-AC10 source ${source} changes nothing`, async ($, on) => {
    setup(on)
    await $.classic.SessionStart({ source })
    expect(writes).toEqual([])
  })
}

for (const source of ['clear', 'resume', 'fork', 'compact', 'startup'] as const) {
  test(`F03-AC8 source ${source} returns what the handler beneath returned`, async ($, on) => {
    setup(on)
    expect(await $.classic.SessionStart({ source })).toStrictEqual(canary)
  })
}
