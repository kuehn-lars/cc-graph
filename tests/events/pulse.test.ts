import reference from '../../fixtures/sessions/reference'
import { expect, mock, test } from 'claude-code/testing'
import { decode, mount, start, ui } from '../ui/kit'
import { observe } from './kit'

const COLUMNS = 64
const ROWS = 25 // a 30-row pane less the view keys, the meter line, the now line and two legend lines
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

test('F09-AC36 a Read while the graph is mounted: four blits for graph at 0, 120, 240 and 400 ms, the border white, shimmer, Claude\'s colour, then plain; no render pass added', async ($, on) => {
  const clock = mock.clock(on)
  const b = setup(on, 'graph')
  await start($)
  const first = await mount($, 'terminal', COLUMNS, 30)
  await b.read($)
  const at: number[] = [] // the millisecond each blit shows up in, stepping the clock by 1
  for (let ms = 0; ms < 600; ms++) {
    await clock.advance(1)
    while (at.length < b.seen.length) at.push(ms)
  }
  expect(b.seen).toHaveLength(4)
  expect(b.seen[0]!.args).toMatchObject({ requestId: 'cc-graph', key: 'graph', columns: COLUMNS, rows: ROWS })
  expect(at[0]).toBeGreaterThanOrEqual(20) // after the queue's delay, not on the Read
  expect(at.map(t => t - at[0]!)).toEqual([0, 120, 240, 400])
  // The read file's box is the only one: its top-left corner carries the border's colour in each frame.
  const corner = (cells: string) => decode({ props: { cells } }).find(c => c.char === '╭' && c.fg !== 0x505050)!.fg // not its folder's frame
  expect(b.seen.map(s => corner(s.args.cells))).toEqual([0xffffff, 0xeb9f7f, 0xd77757, 0xd77757]) // the plain frame: the now node's border is Claude's colour
  expect(b.renders()).toBe(b.seen[3]!.renders)
  await first.unmount()
  const pane = await mount($, 'terminal', COLUMNS, 30)
  expect(b.seen[3]!.args.cells).toBe((await pane.find({ type: 'Raster' })).props.cells) // the last frame is the one a render draws
  expect(b.seen[0]!.renders).toBe(b.seen[3]!.renders)
})

test('F09-R27 a render between the blits ends the pulse: no further blit', async ($, on) => {
  const clock = mock.clock(on)
  const b = setup(on, 'graph')
  on('classic.SessionStart', () => ({}))
  await start($)
  await mount($, 'terminal', COLUMNS, 30)
  await b.read($)
  await clock.advance(100)
  expect(b.seen).toHaveLength(1)
  await clock.advance(80) // the second blit is out, the third is not
  expect(b.seen).toHaveLength(2)
  const before = b.renders()
  await $.classic.SessionStart({ source: 'clear' }) // empties the graph: the pane draws again
  await clock.advance(1)
  expect(b.renders()).toBeGreaterThan(before)
  await clock.advance(1000)
  expect(b.seen).toHaveLength(2)
})

test('F09-AC36 with view list a Read blits nothing and nothing throws', async ($, on) => {
  const clock = mock.clock(on)
  const b = setup(on, 'list')
  await start($)
  await mount($, 'terminal', COLUMNS, 30)
  await b.read($)
  await clock.advance(1100)
  expect(b.seen).toHaveLength(0)
})

test('F09-AC36 a blit answered deny changes nothing: the Read still returns its result', async ($, on) => {
  const clock = mock.clock(on)
  const b = setup(on, 'graph', 'nothing mounted')
  await start($)
  await mount($, 'terminal', COLUMNS, 30)
  const out = await b.read($)
  await clock.advance(1100)
  expect(b.seen).toHaveLength(4) // each ring is refused, the rest still follow
  expect(out).toEqual(read.result)
})
