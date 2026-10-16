import { expect, test } from 'claude-code/testing'
import type { Graph } from '../../types'
import { mount, node, start, ui } from './kit'

const ghosts = (n: number, blind = true) => {
  const files = Object.fromEntries(Array.from({ length: n }, (_, i) => [`src/g${i}.ts`, node(`src/g${i}.ts`, i + 2, { state: 'ghost', mainLoop: false })]))
  const edges = Object.keys(files).map(from => ({ from, to: 'src/auth/login.ts', kind: 'import' as const, blind, guessed: false }))
  return { seq: n + 1, files: { 'src/auth/login.ts': node('src/auth/login.ts', 1, { change: 'edited' }), ...files }, edges, decisions: [], compactions: [] } satisfies Graph
}
const seedGraph = (on: any, graph: Graph) =>
  on('state.get', async (_$: any, e: any, next: any) => (e.key === 'graph' ? ({ value: { value: graph, version: 0 } } as any) : next(e)))
const texts = async (pane: any, text: RegExp) => (await pane.findAll({ type: 'Text', text })).map((t: any) => t.text)

test('F07-AC1 / R10 the Blind spots section names the ghost: "imports login.ts, never opened"', async ($, on) => {
  ui(on); seedGraph(on, ghosts(1))
  await start($)
  const pane = await mount($, 'terminal')
  expect(await texts(pane, /^Blind spots/)).toEqual(['Blind spots'])
  expect(await texts(pane, /never opened/)).toEqual(['src/g0.ts  imports login.ts, never opened'])
})

test('F07-R10 the section lists at most 5, newest first', async ($, on) => {
  ui(on); seedGraph(on, ghosts(7))
  await start($)
  const got = await texts(await mount($, 'terminal'), /never opened/)
  expect(got.map((t: string) => t.split('  ')[0])).toEqual(['src/g6.ts', 'src/g5.ts', 'src/g4.ts', 'src/g3.ts', 'src/g2.ts'])
})

test('F07-AC11 / F08-R7 a ghost whose edge is no longer blind is not listed; an empty section says "No blind spots."', async ($, on) => {
  ui(on); seedGraph(on, ghosts(1, false))
  await start($)
  const pane = await mount($, 'terminal')
  expect(await texts(pane, /never opened/)).toEqual([])
  expect(await texts(pane, /^No blind spots/)).toEqual(['No blind spots.'])
})
