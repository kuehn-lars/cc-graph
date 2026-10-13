import { expect, mock, test } from 'claude-code/testing'
import { ui } from '../ui/kit'
import { replay, written, writes } from './kit'

const layoutWrites = () => writes.filter(k => k === 'layout').length
const sorted = (o: object) => Object.keys(o).sort()

test('NFR-P4 a Read returns before layout is written; advancing mock.clock writes it', async ($, on) => {
  const clock = mock.clock(on)
  ui(on)
  await replay($, on, 1)
  expect(written.graph).toBeDefined()
  expect(written.layout).toBeUndefined()
  await clock.advance(1000)
  expect(sorted(written.layout)).toEqual(sorted(written.graph.files))
})

test('NFR-P4 two Reads before the clock advances give one pass', async ($, on) => {
  const clock = mock.clock(on)
  ui(on)
  await replay($, on, 3)
  expect(layoutWrites()).toBe(0)
  await clock.advance(1000)
  expect(layoutWrites()).toBe(1)
  expect(sorted(written.layout)).toEqual(sorted(written.graph.files))
})

test('F03-R7 /clear empties layout', async ($, on) => {
  const clock = mock.clock(on)
  ui(on)
  on('classic.SessionStart', () => ({}))
  await replay($, on, 1)
  await clock.advance(1000)
  expect(sorted(written.layout)).not.toHaveLength(0)
  await $.classic.SessionStart({ source: 'clear' })
  expect(written.layout).toEqual({})
})

test('F09-AC12 an evicted node has no position after the next pass', async ($, on) => {
  const clock = mock.clock(on)
  ui(on)
  // The positions held from an earlier pass include a node the graph no longer has.
  on('state.get', async (_$, e: any, next) => (e.key === 'layout' ? ({ value: { value: { 'gone.ts': { x: 1, y: 1 } }, version: 0 } } as any) : next(e)))
  await replay($, on, 1)
  await clock.advance(1000)
  expect(sorted(written.layout)).toEqual(sorted(written.graph.files))
  expect(written.layout['gone.ts']).toBeUndefined()
})
