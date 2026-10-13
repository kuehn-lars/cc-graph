import reference from '../../fixtures/sessions/reference'
import { expect, mock, test } from 'claude-code/testing'
import { decode, dots, mount, ofColor, start, ui } from '../ui/kit'
import { observe } from './kit'

const COLUMNS = 64
const IN_CONTEXT = 0x7aa7ff
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

test('F09-AC24 a Read while the graph is mounted: four blits for graph at 0, 120, 240 and 400 ms, no render pass added', async ($, on) => {
  const clock = mock.clock(on)
  const b = setup(on, 'graph')
  await start($)
  await mount($, 'terminal', COLUMNS, 30)
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
  const frames = b.seen.map(s => dots(decode({ props: { cells: s.args.cells } }), COLUMNS))
  const plain = frames[3]!, body = ofColor(plain, IN_CONTEXT), radius = (body.maxX - body.minX) / 2
  // the dots each frame adds to the plain one (a cell has one colour, so a ring dot may recolour a halo dot beside it): the ring's colour, its distance from the node's edge, solid or dotted
  const ring = (i: number, color: number) => {
    const added = [...frames[i]!].filter(([k]) => !plain.has(k))
    expect(added.every(([, c]) => c === color)).toBe(true)
    return added.map(([k]) => { const [x, y] = k.split(',').map(Number); return Math.round(Math.hypot(x! - body.x, y! - body.y) - radius) })
  }
  const [white, wide, faint] = [ring(0, 0xf0f3f6), ring(1, 0x9aa4b1), ring(2, 0x6b7380)]
  for (const [out, gap] of [[4, white], [6, wide], [8, faint]] as const) { // the body's centre sits between dots, so a distance is good to a dot
    expect(Math.min(...gap)).toBeGreaterThanOrEqual(out - 1)
    expect(Math.max(...gap)).toBeLessThanOrEqual(out + 1)
    expect(Math.abs(gap.reduce((a, d) => a + d, 0) / gap.length - out)).toBeLessThan(0.5)
  }
  expect(faint.length).toBeLessThan(1.5 * Math.PI * (radius + 8)) // dotted: about half the dots of a solid ring (2π·r)
  expect(b.seen[0]!.renders).toBe(b.seen[3]!.renders)
  expect(b.renders()).toBe(b.seen[3]!.renders)
})

test('F09-R19 a render between the blits ends the pulse: no further blit', async ($, on) => {
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

test('F09-AC24 with view list a Read blits nothing and nothing throws', async ($, on) => {
  const clock = mock.clock(on)
  const b = setup(on, 'list')
  await start($)
  await mount($, 'terminal', COLUMNS, 30)
  await b.read($)
  await clock.advance(1100)
  expect(b.seen).toHaveLength(0)
})

test('F09-AC24 a blit answered deny changes nothing: the Read still returns its result', async ($, on) => {
  const clock = mock.clock(on)
  const b = setup(on, 'graph', 'nothing mounted')
  await start($)
  await mount($, 'terminal', COLUMNS, 30)
  const out = await b.read($)
  await clock.advance(1100)
  expect(b.seen).toHaveLength(4) // each ring is refused, the rest still follow
  expect(out).toEqual(read.result)
})
