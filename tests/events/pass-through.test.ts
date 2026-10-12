import reference from '../../fixtures/sessions/reference'
import { expect, test } from 'claude-code/testing'
import { engine } from './kit'

// F01-AC8: observation only. Each tool call of the reference session is answered, beneath the mod, with the result
// Claude Code returned, plus one field no hook knows ("canary"); whatever the F01 hook does with it, what comes back is
// that answer, field for field.
// ponytail: not `toBe`. The kit hands `$.tool.call` a copy of what the chain returned (no event keeps identity, with or
// without a hook above it), so identity cannot be observed from a test. Strict equality catches a hook that rebuilds
// the answer from a list of fields, drops one, or adds one; it cannot catch a plain `{ ...out }`. See the F01 ticket 07 report.
const calls = reference.events.filter(e => e.event === 'tool.call')

test('F01-AC8 the reference session has its 14 recorded tool calls', () => {
  expect(calls.map(c => c.step)).toEqual([1, 2, 3, 4, 5, 5, 6, 7, 8, 9, 10, 11, 12, 13])
})

for (const c of calls) {
  test(`F01-AC8 step ${c.step} ${c.input.tool} returns what the handler beneath returned`, async ($, on) => {
    const { tool_use_id, ...input } = c.input as any
    const answer = engine(on, { tool: input.tool, tool_use_id, input, result: null })
    Object.assign(answer, c.result, { canary: 'unknown to every hook' })
    await $.session.start({ cwd: (reference.events[0]!.input as any).cwd, surface: null, isInteractive: false })
    expect(await $.tool.call(input)).toStrictEqual(answer)
  })
}
