// node scripts/record-memory-session.mjs <out.ts> <probe-log.json>
// Turns the log the memory probe wrote (fixtures/sessions/memory-probe) into fixtures/sessions/memory.ts.
// Every input, result and usage is kept exactly as the hook saw it, except that the home folder in a classic hook's
// `transcript_path` becomes `/home/user` (the repository is public). See fixtures/sessions/README.md.
import { homedir } from 'node:os'
import { readFileSync, writeFileSync } from 'node:fs'

const [out, log] = process.argv.slice(2)
const events = JSON.parse(readFileSync(log, 'utf8'))
for (const { input } of events) if (input.transcript_path) input.transcript_path = input.transcript_path.replace(homedir(), '/home/user')
const names = events.map(e => e.event).join()
if (names !== 'session.start,session.measure,classic.InstructionsLoaded,session.measure') throw new Error(`unexpected events ${names}`)
writeFileSync(out, 'export default ' + JSON.stringify({ claudeCode: '2.1.296', events }, null, 1) + '\n')
