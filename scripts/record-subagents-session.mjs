// node scripts/record-subagents-session.mjs <out.ts> <probe-log.json>
// Turns the log the subagents probe wrote (fixtures/sessions/subagents-probe) into fixtures/sessions/subagents.ts.
// Every input and result is kept exactly as the hook saw it; this script only labels each row with its step in
// fixtures/sessions/subagents-turn1.txt. See fixtures/sessions/README.md.
import { readFileSync, writeFileSync } from 'node:fs'

const [out, log] = process.argv.slice(2)
const rows = JSON.parse(readFileSync(log, 'utf8'))
// Step by the tool call that opens it: the Explore Agent call is 1, the main loop's Read 2, the worktree Agent call 3.
const events = rows.map(row => {
  const { tool, agentId } = row.input ?? {}
  const step = row.event !== 'tool.call' ? undefined : tool === 'Agent' ? (row.input.isolation === 'worktree' ? 3 : 1) : !agentId ? 2 : undefined
  return step ? { step, ...row } : row
})
const steps = events.map(e => e.step).filter(Boolean).join()
if (steps !== '1,2,3') throw new Error(`expected steps 1,2,3 once each, found ${steps}`)
writeFileSync(out, 'export default ' + JSON.stringify({ claudeCode: '2.1.296', events }, null, 1) + '\n')
