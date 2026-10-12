// node scripts/record-wide-session.mjs gen <dir>
//   writes the wide project (30 small files, three with a TODO) into <dir>; git init and commit it yourself.
// node scripts/record-wide-session.mjs <out.ts> <expected tool calls> <probe-log.json>...
//   joins the logs the wide probe wrote (one per `claude -p` process, in order) into <out.ts>, for
//   fixtures/sessions/wide.ts and many-changes.ts. Every input and result is kept exactly as the hook saw it; the home
//   folder becomes `/home/user` (the repository is public) and each row gets its process number.
//   See fixtures/sessions/README.md.
import { homedir } from 'node:os'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const [first, ...rest] = process.argv.slice(2)
if (first === 'gen') {
  const dir = rest[0]
  mkdirSync(dir + '/src', { recursive: true })
  for (let i = 1; i <= 30; i++) {
    const n = String(i).padStart(2, '0')
    const todo = [14, 20, 25].includes(i) ? '  // TODO: handle negative input\n' : ''
    writeFileSync(`${dir}/src/m${n}.ts`, `export function m${n}(x: number): number {\n${todo}  return x + ${i}\n}\n`)
  }
  writeFileSync(dir + '/README.md', '# wide\n\nThirty small modules, src/m01.ts to src/m30.ts.\n')
} else {
  const [expected, ...logs] = rest
  const events = []
  logs.forEach((f, i) => {
    for (const row of JSON.parse(readFileSync(f, 'utf8').replaceAll(homedir(), '/home/user'))) events.push({ process: i + 1, ...row })
  })
  const calls = events.filter(e => e.event === 'tool.call').length
  if (calls !== Number(expected)) throw new Error(`expected ${expected} tool calls, found ${calls}`)
  // .ts, not .json: a test can import only code-named files (as in fixtures/tool-results).
  writeFileSync(first, 'export default ' + JSON.stringify({ claudeCode: '2.1.296', events }, null, 1) + '\n')
}
