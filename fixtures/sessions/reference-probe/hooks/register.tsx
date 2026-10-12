// Throwaway recording probe for fixtures/sessions/reference.ts (see ../../README.md). Not part of the mod.
// It logs the events of the reference session as the hooks see them and serves the F12 tool `log_decision`.
import type { Register } from 'claude-code'

const OUT = '/tmp/cc-graph-reference/log-' + Date.now() + '.json'
const rows: any[] = []
// Decisions logged by earlier processes of the recording: 0 for turn 1 and the compaction, 1 for turn 2.
let decisions = 0
const open = (event: string, input: any) => { const row: any = { event, input }; rows.push(row); return row }
const dump = () => JSON.stringify(rows, null, 1)
// F12-R1 and F12-R4 in spirit. The engine refuses an object as a plugin tool's result (string, array or undefined only),
// so the answer is the JSON of `{ logged, id }`.
const mine = (e: any) => e.tool === 'mcp__cc-graph__log_decision' ? { result: JSON.stringify({ logged: true, id: 'D' + ++decisions }) } : null

export const register: Register = on => {
  on('session.start', async ($, e: any, next: any) => {
    await $.tool.register({ name: 'log_decision', description: 'Log a design decision: a short title, the files it affects and why.', isDeferred: false, inputSchema: { type: 'object', properties: { title: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, because: { type: 'string' } }, required: ['title', 'files'] } })
    const row = open('session.start', e)
    const out = await next(e)
    row.result = out
    await $.fs.write(OUT, dump())
    return out
  }).catch(($, e, next) => next(e))
  on('turn.start', async ($, e: any, next: any) => {
    const row = open('turn.start', e)
    const out = await next(e)
    row.result = out
    await $.fs.write(OUT, dump())
    return out
  }).catch(($, e, next) => next(e))
  on('prompt.submit', async ($, e: any, next: any) => {
    const row = open('prompt.submit', e)
    const out = await next(e)
    row.result = out
    await $.fs.write(OUT, dump())
    return out
  }).catch(($, e, next) => next(e))
  on('prompt.attachment', async ($, e: any, next: any) => {
    const row = open('prompt.attachment', e)
    const out = await next(e)
    row.result = out
    await $.fs.write(OUT, dump())
    return out
  }).catch(($, e, next) => next(e))
  on('session.compact', async ($, e: any, next: any) => {
    const row = open('session.compact', e)
    const out = await next(e)
    row.result = out
    await $.fs.write(OUT, dump())
    return out
  }).catch(($, e, next) => next(e))
  on('classic.InstructionsLoaded', async ($, e: any, next: any) => {
    const row = open('classic.InstructionsLoaded', e)
    const out = await next(e)
    row.result = out
    await $.fs.write(OUT, dump())
    return out
  }).catch(($, e, next) => next(e))
  on('tool.call', async ($, e: any, next: any) => {
    const row = open('tool.call', e)
    const out = mine(e) ?? await next(e)
    row.result = out
    await $.fs.write(OUT, dump())
    return out
  }).catch(($, e, next) => next(e))
}
