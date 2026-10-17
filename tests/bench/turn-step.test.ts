import thinking from '../../fixtures/sessions/thinking'
import { expect, test } from 'claude-code/testing'

// NFR-P2: a 2,000-chunk step through the mod's `turn.step` hook, DERIVED from the recorded thinking chunks of the
// shown session, cycled (refs dropped: a ref is one step's only). The kit's own cost is in the time too, so the bound
// holds the hook and the kit together. The suite runs files in parallel: the best of three runs counts.
const step: any = thinking.shown.find((r: any) => r.event === 'turn.step' && !r.input.agentId)!
const recorded = step.chunks.filter((c: any) => c.kind === 'thinking').map(({ ref, ...c }: any) => c)
const chunks = Array.from({ length: 2000 }, (_, i) => recorded[i % recorded.length])

test('NFR-P2 a 2,000-chunk step through the turn.step hook takes under 1 ms per chunk', { timeoutMs: 60_000 }, async ($, on) => {
  on('turn.step', async function* () {
    for (const c of chunks) yield c
    return step.result
  })
  const runs: number[] = []
  for (let run = 0; run < 3; run++) {
    let n = 0
    const t = Date.now()
    for await (const _ of $.turn.step(step.input)) n++
    runs.push((Date.now() - t) / n)
    expect(n).toBe(2000)
  }
  expect(Math.min(...runs)).toBeLessThan(1)
})
