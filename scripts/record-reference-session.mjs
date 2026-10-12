// node scripts/record-reference-session.mjs <out.ts> <probe-log.json>...
// Joins the logs a recording probe wrote (one per `claude -p` process, in order) into fixtures/sessions/reference.ts.
// Every input and result is kept exactly as the hook saw it. This script only drops the prompt attachments that are
// engine boilerplate (environment, model, skill listing, session context with the person's email, ...) and labels
// each row with its process and, for tool calls, its step in specs/04-reference-session. See fixtures/sessions/README.md.
import { readFileSync, writeFileSync } from 'node:fs'

const [out, ...logs] = process.argv.slice(2)
// The story's steps in the order Claude Code ran the 14 tool calls (step 5 is two Reads).
const STEPS = [1, 2, 3, 4, 5, 5, 6, 7, 8, 9, 10, 11, 12, 13]
const KEEP = new Set(['file', 'nested_memory', 'instructions', 'edited_text_file'])

let call = 0
const events = []
logs.forEach((f, i) => {
  for (const row of JSON.parse(readFileSync(f, 'utf8'))) {
    if (row.event === 'prompt.attachment' && !KEEP.has(row.input.type)) continue
    const step = row.event === 'tool.call' ? STEPS[call++] : undefined
    events.push({ process: i + 1, ...(step && { step }), ...row })
  }
})
if (call !== STEPS.length) throw new Error(`expected ${STEPS.length} tool calls, found ${call}`)
// .ts, not .json: a test can import only code-named files (as in fixtures/tool-results).
writeFileSync(out, 'export default ' + JSON.stringify({ claudeCode: '2.1.296', events }, null, 1) + '\n')
