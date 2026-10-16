#!/usr/bin/env node
// Static privacy and robustness checks; the rules are in specs/01-architecture/spec.md, CI.
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fullBreakdowns } from './full-breakdown.mjs'

const root = resolve(process.argv[2] ?? '.')
const ALLOWED = new Set([
  '$.agent.list', '$.clock.after', '$.clock.now', '$.command.register', '$.model.fork', '$.process.run',
  '$.prompt.fill', '$.session.cwd', '$.session.surfaces', '$.session.usage', '$.state.get', '$.state.set', '$.tool.register',
  '$.ui.blit', '$.ui.log', '$.ui.open', '$.ui.resolve', '$.ui.toast',
])
const problems = []

const run = spawnSync('claude', ['plugin', 'validate', '--json', root], { encoding: 'utf8' })
let report
try {
  report = JSON.parse(run.stdout)
} catch {
  console.error(`claude plugin validate --json gave no report:\n${run.stderr || run.stdout}`)
  process.exit(1)
}

for (const entry of [report.manifest, ...report.contents]) {
  for (const e of entry.errors) problems.push(`error: ${entry.file}: ${e.path}: ${e.message}`)
  for (const w of entry.warnings)
    if (!(entry.file === join(root, 'CLAUDE.md') && w.path === 'root'))
      problems.push(`warning: ${entry.file}: ${w.path}: ${w.message}`)
  for (const g of entry.gatingHooks)
    if (!g.hasCatch) problems.push(`NFR-R1: gating hook without .catch: ${g.module} ${g.hook}`)
  for (const note of entry.notes) {
    const calls = note.match(/ calls: (\$.*)$/)?.[1].split(/, (?=\$)/).map(c => c.replace(/ \(via .*\)$/, '')) ?? []
    for (const call of calls) if (!ALLOWED.has(call)) problems.push(`NFR-S1: ${call} is not on the allowlist`)
    if (/ hooks: .*\btelemetry\.| hooks telemetry for: /.test(note)) problems.push(`NFR-S3: ${note}`)
  }
}

// ponytail: regex scan, not a parser; a call built through a helper (spread argv) escapes it.
const hooksDir = join(root, 'hooks')
const sources = existsSync(hooksDir)
  ? readdirSync(hooksDir, { recursive: true }).filter(f => /\.[mc]?[jt]sx?$/.test(f)).map(f => join(hooksDir, f))
  : []
for (const file of sources) {
  const src = readFileSync(file, 'utf8')
  const at = i => `${file}:${src.slice(0, i).split('\n').length}`
  for (const m of src.matchAll(/\.process\.run\(\s*(\S)/g))
    if (m[1] !== '[' && !/[\w$]/.test(m[1])) problems.push(`NFR-S4: ${at(m.index)}: process.run takes an argument list`)
  for (const m of src.matchAll(/\.process\.run\(\s*\[\s*['"`](sh|bash|zsh|cmd|powershell|pwsh)['"`]/g))
    problems.push(`NFR-S4: ${at(m.index)}: process.run through a shell (${m[1]})`)
  for (const m of src.matchAll(/\[\s*['"`]git['"`]\s*,\s*['"`]([^'"`]+)['"`](\s*,\s*['"`]--(name-status|numstat)['"`])?/g))
    if (!['rev-parse', 'status', 'grep'].includes(m[1]) && !(m[1] === 'diff' && m[2])) problems.push(`NFR-S5: ${at(m.index)}: git ${m[1]} is not read-only`)
  if (/['"`]git['"`]/.test(src) && !/GIT_OPTIONAL_LOCKS\s*:\s*['"`]0['"`]/.test(src))
    problems.push(`NFR-S5: ${file}: git runs without GIT_OPTIONAL_LOCKS: '0'`)
  for (const i of fullBreakdowns(src)) problems.push(`NFR-S6: ${at(i)}: $.session.usage with breakdown 'full'`)
  if ((src.match(/\.model\.fork\(/g) ?? []).length > 1)
    problems.push(`NFR-S6: ${file}: $.model.fork has more than one call site (only the "Ask why" press)`)
}

for (const p of problems) console.error(p)
console.log(`check-calls: ${problems.length} problem${problems.length === 1 ? '' : 's'}`)
process.exit(problems.length ? 1 : 0)
