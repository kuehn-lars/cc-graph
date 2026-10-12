import { expect, test } from 'claude-code/testing'
import { mount, node, run, seed, start, ui, writes } from './kit'

/** A measurement as the engine raises it; `context` is the figure a test cares about. */
const measure = ($: any, context: object, changed: string[] = ['context']) =>
  $.session.measure({ context, rateLimits: [], changed })

/** The meter line the pane draws: the Text that holds "window". */
const meter = async (pane: any): Promise<string | undefined> => (await pane.find({ type: 'Text', text: /window/ }))?.text

test('F03-AC5 a measurement of 82000 of 200000 at 41% makes the meter read "window 41% of 200k"', async ($, on) => {
  ui(on)
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await start($)
  await measure($, { tokens: 82000, window: 200000, percent: 41 })
  expect(await meter(await mount($, 'terminal'))).toMatch(/ · window 41% of 200k$/)
})

test('F03-AC12 with no measurement the meter reads "window –"', async ($, on) => {
  ui(on)
  await start($)
  expect(await meter(await mount($, 'terminal'))).toBe('≈0 in 0 files · window –')
})

test('F03-AC13 with no surface and no measurement /graph answers a text starting with the meter line', async ($, on) => {
  ui(on, undefined, [])
  await start($)
  const out = await run($)
  expect(out.text.split('\n')[0]).toBe('≈0 in 0 files · window –')
})

test('F03-R5 the left part sums the main loop in-context nodes with a known size and counts the unknown ones', async ($, on) => {
  ui(on, undefined, [])
  seed(on,
    node('a', 1, { tokens: 1500 }),
    node('b', 2, { state: 'partial', tokens: 2800 }),
    node('c', 3, { state: 'search', tokens: null }),
    node('d', 4, { tokens: null }),
    node('e', 5, { state: 'compacted', tokens: 9000 }),
    node('f', 6, { state: 'ghost', tokens: 9000 }),
    node('g', 7, { tokens: 5000, mainLoop: false }),
  )
  await start($)
  expect((await run($)).text.split('\n')[0]).toBe('≈4.3k in 2 files (+2 unknown) · window –')
})

test('F03-R5a counts below 1,000 read plain, round thousands lose ".0"', async ($, on) => {
  ui(on, undefined, [])
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  seed(on, node('a', 1, { tokens: 850 }))
  await start($)
  await measure($, { tokens: 6200, window: 12400, percent: 50 })
  expect((await run($)).text.split('\n')[0]).toBe('≈850 in 1 file · window 50% of 12.4k')
})

test('F03-R6 a fill reported without percent reads "window –"', async ($, on) => {
  ui(on)
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await start($)
  await measure($, { window: 200000 })
  expect(await meter(await mount($, 'terminal'))).toMatch(/ · window –$/)
})

test('F03-R4 a measurement whose changed lacks context writes nothing and returns what the handler beneath returned', async ($, on) => {
  ui(on)
  on('session.measure', () => ({ changed: ['cost'] }))
  const seen = writes(on)
  await start($)
  const out = await measure($, { tokens: 82000, window: 200000, percent: 41 }, ['cost'])
  expect(out).toEqual({ changed: ['cost'] })
  expect(seen.filter(w => w.key === 'fill')).toEqual([])
})
