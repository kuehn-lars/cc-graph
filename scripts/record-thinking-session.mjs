// node scripts/record-thinking-session.mjs <out.ts> <shown-log.json> <hidden-log.json>
// Turns two logs the thinking probe wrote (fixtures/sessions/thinking-probe) into fixtures/sessions/thinking.ts:
// `shown` from a session with thinking summaries on, `hidden` from one without. Every input, chunk and result is kept
// exactly as the hook saw it. See fixtures/sessions/README.md.
import { readFileSync, writeFileSync } from 'node:fs'

const [out, shown, hidden] = process.argv.slice(2)
const events = { shown: JSON.parse(readFileSync(shown, 'utf8')), hidden: JSON.parse(readFileSync(hidden, 'utf8')) }
// Streamed tool input splits a path across chunks, so a personal path cannot be rewritten: record in a neutral folder.
const leaked = JSON.stringify(events).match(/\/Users\/|scratchpad/)
if (leaked) throw new Error(`a personal path is in the log (${leaked[0]}): record in /private/tmp/claude-501/rec-thinking/sample-app`)
// The account's connectors can add their own context to a read, and Claude may describe it: never publish which servers an account has.
const account = JSON.stringify(events).match(/MCP|claude_ai/i)
if (account) throw new Error(`the log names account context (${account[0]}): redact those sentences, see fixtures/sessions/README.md`)
writeFileSync(out, 'export default ' + JSON.stringify({ claudeCode: '2.1.302', ...events }, null, 1) + '\n')
