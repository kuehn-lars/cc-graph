import { expect, test } from 'claude-code/testing'
import { start } from '../events/kit'

// F14-Q1: the engine checks `options` against the manifest's `min` and `max` before `register` runs, so a value of 500 never reaches the mod.
test('F14-AC5 maxNodes 500 is refused at load, naming the bound', { options: { maxNodes: 500 } }, async ($, on) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  await expect(start($)).rejects.toThrow(/Most files in the graph must be at most 200/)
})

test('F14-AC5 the lowest allowed maxNodes, 20, loads', { options: { maxNodes: 20 } }, async ($, on) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  await start($)
})

// F14-AC3: `claude plugin validate` (check-calls.mjs) reports the manifest; this proves the engine reads the declared bounds and title.
test('F14-AC3 maxNodes 19 is refused at load, naming the title and the lower bound', { options: { maxNodes: 19 } }, async ($, on) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  await expect(start($)).rejects.toThrow(/Most files in the graph must be at least 20/)
})
