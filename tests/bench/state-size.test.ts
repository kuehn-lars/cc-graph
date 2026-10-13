import manyChanges from '../../fixtures/sessions/many-changes'
import reference from '../../fixtures/sessions/reference'
import wide from '../../fixtures/sessions/wide'
import { expect, test } from 'claude-code/testing'
import { replayAll, written } from '../events/kit'

// NFR-P5: the 500-call fixture is the recorded tool calls of the wide, many-changes and reference sessions, cycled to
// 500. Each cycle moves `file_path` under its own folder (`c3/src/m01.ts`), so 500 calls touch hundreds of files
// (DERIVED: paths renamed, results as recorded). The cap is at its largest, 200, the state's worst case.
const recorded = [wide, manyChanges, reference].flatMap(s => s.events.filter(e => e.event === 'tool.call'))
const cwd = (wide.events[0]!.input as any).cwd as string
const moved = (input: any, cycle: number) =>
  input.file_path ? { ...input, file_path: `${cwd}/c${cycle}/${input.file_path.split('/').slice(-2).join('/')}` } : input
const calls = Array.from({ length: 500 }, (_, i) => {
  const c = recorded[i % recorded.length]!
  return { event: 'tool.call', input: moved(c.input, Math.floor(i / recorded.length)), result: c.result }
})

test('NFR-P5 all of the state stays under 1 MB of JSON after the 500-call fixture', { options: { maxNodes: 200 }, timeoutMs: 60_000 }, async ($, on) => {
  await replayAll($, on, { events: [wide.events[0]!, wide.events[1]!, ...calls] })
  expect(Object.keys(written.graph.files).length).toBeGreaterThanOrEqual(200)
  expect(JSON.stringify(written).length).toBeLessThan(1024 * 1024)
})
