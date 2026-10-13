#!/usr/bin/env node
// Criterion ↔ test check; the rules are in specs/README.md, Traceability.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

process.chdir(fileURLToPath(new URL('..', import.meta.url)))

const STATUS = ['Draft', 'Review', 'Approved', 'Implemented', 'Verified']
const files = (dir, re) =>
  existsSync(dir) ? readdirSync(dir, { recursive: true }).map(f => join(dir, f)).filter(f => re.test(f)) : []
const milestone = v => v.replace(/^v/, '').split('.').slice(0, 2).reduce((a, n) => a * 1000 + Number(n), 0)
const current = milestone(JSON.parse(readFileSync('.claude-plugin/plugin.json', 'utf8')).version)

const tested = new Set()
for (const f of files('tests', /\.test\.tsx?$/))
  for (const [, id] of readFileSync(f, 'utf8').matchAll(/\b(?:test|it)\(\s*['"`]((?:F\d+-AC|NFR-[A-Z]|RS-)\d+)\b/g))
    tested.add(id)
// An NFR no test can run is traced by the check that names it: a script's problem message or a CI workflow comment.
for (const f of [...files('scripts', /\.mjs$/), ...files('.github/workflows', /\.ya?ml$/)])
  for (const [, id] of readFileSync(f, 'utf8').matchAll(/(?:[`'"]|# )(NFR-[A-Z]\d+)\b/g)) tested.add(id)

const required = []
const pending = []
for (const f of files('specs', /spec\.md$/).filter(f => !f.includes('_template'))) {
  const text = readFileSync(f, 'utf8')
  const status = STATUS.indexOf(text.match(/^\| Status \|.*\n.*\n\|\s*(\w+)/m)?.[1])
  if (status < STATUS.indexOf('Approved')) continue
  const add = (id, isRequired) => tested.has(id) || (isRequired ? required : pending).push(`${id}  (${f})`)

  for (const [, id, from] of text.matchAll(/^- \*\*(F\d+-AC\d+)\*\*(?: \(from (v\d+\.\d+)\))?/gm))
    add(id, status >= STATUS.indexOf('Implemented') && (!from || milestone(from) <= current))
  for (const [, id, from] of text.matchAll(/^\| (NFR-[A-Z]\d+) \|.*\| (v\d+\.\d+) \|$/gm)) add(id, milestone(from) <= current)
  const rsFrom = {}
  for (const [, ids, from] of text.matchAll(/(RS-\d+(?: and RS-\d+)*) from (v\d+\.\d+)/g))
    for (const [id] of ids.matchAll(/RS-\d+/g)) rsFrom[id] = milestone(from)
  for (const [, id] of text.matchAll(/^- \*\*(RS-\d+)\*\*/gm)) add(id, (rsFrom[id] ?? milestone('v1.0')) <= current)
}

if (pending.length) console.log(`pending (no test yet, not required):\n  ${pending.join('\n  ')}`)
if (required.length) console.log(`missing (required, no test):\n  ${required.join('\n  ')}`)
console.log(`trace: ${tested.size} tested, ${required.length} missing, ${pending.length} pending`)
if (process.argv.includes('--check') && required.length) process.exit(1)
