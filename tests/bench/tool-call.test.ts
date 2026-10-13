import reference from '../../fixtures/sessions/reference'
import { expect, test } from 'claude-code/testing'
import { beneath, seedGraph, turn } from '../events/kit'
import { node } from '../ui/kit'

// NFR-P1: 200 calls cycled from the reference session's recorded tool calls, each answered at once beneath the mod,
// on a graph seeded with 60 nodes. Each call is paired with a baseline: the same call under a tool name the mod's
// matcher skips (`Glob`), so the kit's own cost is in both and the difference is the hook's own time.
// The suite runs its files in parallel, so a run's p99 carries other files' load: the best of three runs counts.
// ponytail: Date.now() has 1 ms resolution; enough against limits of 5 and 50 ms.
const recorded = reference.events.filter(e => e.event === 'tool.call')
const quantile = (xs: number[], q: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * q))]!

test('NFR-P1 a tool.call hook takes under 5 ms median and 50 ms at p99 with 60 nodes', { timeoutMs: 60_000 }, async ($, on) => {
  const answer = beneath(on)
  seedGraph(on, {
    seq: 60, files: Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`seed/f${i}.ts`, node(`seed/f${i}.ts`, i + 1)])),
    edges: [], decisions: [], compactions: [],
  })
  await $.session.start({ ...(reference.events[0]!.input as any) })
  await turn($)
  const timed = async (input: any) => {
    const t = Date.now()
    await $.tool.call(input)
    return Date.now() - t
  }
  const runs: { p50: number; p99: number }[] = []
  for (let run = 0; run < 3; run++) {
    const own: number[] = []
    for (let i = 0; i < 200; i++) {
      const c = recorded[i % recorded.length]!
      answer(c.result)
      const base = await timed({ ...(c.input as any), tool: 'Glob' })
      own.push((await timed(c.input)) - base)
    }
    runs.push({ p50: quantile(own, 0.5), p99: quantile(own, 0.99) })
  }
  const best = runs.reduce((a, b) => (b.p99 < a.p99 ? b : a))
  expect(best.p50).toBeLessThan(5)
  expect(best.p99).toBeLessThan(50)
})
