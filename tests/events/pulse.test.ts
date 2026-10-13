import reference from '../../fixtures/sessions/reference'
import { expect, mock, test } from 'claude-code/testing'
import { decode, dots, mount, start, ui } from '../ui/kit'
import { observe } from './kit'

const COLUMNS = 64
const ROWS = 26 // a 30-row pane less the view keys, the meter line, the now line and the legend
const read = reference.events.find(c => c.event === 'tool.call' && c.process === 1 && c.step === 1)!

/**
 * The test's hooks beneath the mod: `view` is `view`, the recorded first Read is what a `tool.call` answers, `ui.blit` records its args and the render count at that moment (every render reads `view`) and answers `deny` when given.
 * Returns the Read: send it after the pane is mounted.
 */
function setup(on: any, view: 'list' | 'graph', deny?: string) {
  const seen: { args: any; renders: number }[] = []
  let renders = 0
  ui(on)
  on('tool.call', () => read.result)
  observe(on)
  on('state.get', (_$: any, e: any, next: any) => {
    if (e.key === 'view') renders++
    return e.key === 'view' ? ({ value: { value: view, version: 0 } } as any) : next(e)
  })
  on('ui.blit', (_$: any, e: any) => (seen.push({ args: e, renders }), { value: deny ? { deny } : {} }))
  return { seen, renders: () => renders, read: ($: any) => $.tool.call(read.input) }
}

test('F09-AC9 a Read while the graph is mounted: one blit for graph, a second 1000 ms later, no render pass added', async ($, on) => {
  const clock = mock.clock(on)
  const b = setup(on, 'graph')
  await start($)
  await mount($, 'terminal', COLUMNS, 30)
  await b.read($)
  await clock.advance(100) // the queue: layout, then the pulse
  expect(b.seen).toHaveLength(1)
  const [first] = b.seen
  expect(first!.args).toMatchObject({ requestId: 'cc-graph', key: 'graph', columns: COLUMNS, rows: ROWS })
  await clock.advance(1000)
  await clock.advance(1000)
  await clock.advance(1000)
  expect(b.seen).toHaveLength(2)
  const [ring, clear] = b.seen.map(s => decode({ props: { cells: s.args.cells } }))
  expect(ring).toHaveLength(COLUMNS * ROWS)
  const lit = dots(ring!, COLUMNS), after = dots(clear!, COLUMNS)
  const added = [...lit].filter(([k]) => !after.has(k))
  expect(added.length).toBeGreaterThan(8) // the white ring around the node
  expect(added.every(([, color]) => color === 0xf0f3f6)).toBe(true)
  expect(b.seen[0]!.renders).toBe(b.seen[1]!.renders)
  expect(b.renders()).toBe(b.seen[1]!.renders)
})

test('F09-R7 a render between the blits ends the pulse: no second blit', async ($, on) => {
  const clock = mock.clock(on)
  const b = setup(on, 'graph')
  on('classic.SessionStart', () => ({}))
  await start($)
  await mount($, 'terminal', COLUMNS, 30)
  await b.read($)
  await clock.advance(100)
  expect(b.seen).toHaveLength(1)
  const before = b.renders()
  await $.classic.SessionStart({ source: 'clear' }) // empties the graph: the pane draws again
  await clock.advance(1)
  expect(b.renders()).toBeGreaterThan(before)
  await clock.advance(1000)
  expect(b.seen).toHaveLength(1)
})

test('F09-AC9 with view list a Read blits nothing and nothing throws', async ($, on) => {
  const clock = mock.clock(on)
  const b = setup(on, 'list')
  await start($)
  await mount($, 'terminal', COLUMNS, 30)
  await b.read($)
  await clock.advance(1100)
  expect(b.seen).toHaveLength(0)
})

test('F09-AC9 a blit answered deny changes nothing: the Read still returns its result', async ($, on) => {
  const clock = mock.clock(on)
  const b = setup(on, 'graph', 'nothing mounted')
  await start($)
  await mount($, 'terminal', COLUMNS, 30)
  const out = await b.read($)
  await clock.advance(1100)
  expect(b.seen).toHaveLength(2) // the ring is refused, the clear still follows
  expect(out).toEqual(read.result)
})
