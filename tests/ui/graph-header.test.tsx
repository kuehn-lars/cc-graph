import { expect, test } from 'claude-code/testing'
import { mount, node, start, ui } from './kit'

const FILL = { tokens: 60000, window: 1000000, percent: 6 }
/** The test's own `state.get` hook beneath the mod: the graph view of these nodes and this fill. */
function viewFilled(on: any, fill: unknown, ...nodes: any[]) {
  const values: Record<string, unknown> = { view: 'graph', fill, graph: { seq: nodes.length, files: Object.fromEntries(nodes.map(n => [n.path, n])), edges: [], decisions: [], compactions: [] } }
  on('state.get', async (_$: any, e: any, next: any) => (e.key in values ? ({ value: { value: values[e.key], version: 0 } } as any) : next(e)))
}
/** The meter line: the Text made of other Texts that holds the bar or "window –". */
const meter = async (pane: any) => (await pane.findAll({ type: 'Text', text: /^(━|window –)/ })).find((t: any) => t.children.some((c: any) => typeof c !== 'string'))

const files = () => [node('a.ts', 1), node('b.ts', 2), node('c.ts', 3), node('d.ts', 4, { state: 'compacted' }), node('e.ts', 5, { state: 'unread', tokens: null, change: 'blind' })]

test('F09-AC22 the meter line reads a bar, the percent, the tokens and the counts, with the first segment and the unseen count coloured', async ($, on) => {
  ui(on)
  viewFilled(on, FILL, ...files())
  await start($)
  const pane = await mount($, 'terminal', 100, 30)
  expect((await meter(pane)).text).toBe('━━━━━━━━━━━━━━━━ 6% of 1M  ≈300 tokens · 3 files · 1 compacted · 1 changed unseen')
  expect((await pane.find({ type: 'Text', text: /^━$/ }))?.props.color).toBe('suggestion')
  expect((await pane.find({ type: 'Text', text: /^1 changed unseen$/ }))?.props.color).toBe('error')
})

test('F09-R21 without a percent the meter says "window –" and draws no bar', async ($, on) => {
  ui(on)
  viewFilled(on, { tokens: null, window: 200000, percent: null }, node('a.ts', 1))
  await start($)
  const text = (await meter(await mount($, 'terminal', 100, 30))).text
  expect(text).toBe('window –  ≈100 tokens · 1 files')
})

test('F09-R11 R21 the title leads the view keys, which stay pressable when the meter line is cut', async ($, on) => {
  ui(on)
  viewFilled(on, FILL, ...files())
  await start($)
  const pane = await mount($, 'terminal', 64, 30)
  expect((await pane.find({ type: 'Text', text: 'CC Graph' }))?.props.bold).toBe(true)
  expect(await pane.find({ type: 'Text', text: 'what Claude knows' })).toBeDefined()
  const text = (await meter(pane)).text
  expect([...text]).toHaveLength(64)
  expect(text.endsWith('…')).toBe(true)
  expect((await pane.findAll({ type: 'Button' })).map((b: any) => b.key)).toEqual(expect.arrayContaining(['view-list', 'view-graph']))
})

test('F09-AC37 the lines around the graph name theme keys: ✻ and ⏺ in claude, the bar in suggestion, never hex', async ($, on) => {
  ui(on)
  viewFilled(on, FILL, ...files())
  await start($)
  const pane = await mount($, 'terminal', 100, 30)
  expect((await pane.find({ type: 'Text', text: /^✻$/ }))?.props.color).toBe('claude')
  expect((await pane.find({ type: 'Text', text: /^⏺$/ }))?.props.color).toBe('claude')
  expect((await pane.find({ type: 'Text', text: /^━$/ }))?.props.color).toBe('suggestion')
  const colors = (await pane.findAll({ type: 'Text' })).map((t: any) => t.props.color).filter(Boolean)
  expect(colors.length).toBeGreaterThan(3)
  expect(colors.filter((c: string) => c.startsWith('#'))).toEqual([])
})

test('F09-R11 the list view keeps its own header', async ($, on) => {
  ui(on)
  await start($)
  expect(await (await mount($, 'terminal', 64, 30)).find({ type: 'Text', text: 'CC Graph' })).toBeUndefined()
})
