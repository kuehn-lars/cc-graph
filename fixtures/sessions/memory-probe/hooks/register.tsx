// Throwaway recording probe for fixtures/sessions/memory.ts (see ../../README.md). Not part of the mod.
// It logs session.start, session.measure and classic.InstructionsLoaded as the hooks see them (with the next(e) result), and at
// session.start and at each session.measure whose `changed` holds `context` also the result of $.session.usage({ breakdown: 'summary' }).
import type { Register } from 'claude-code'

const OUT = '/tmp/cc-graph-memory/log-' + Date.now() + '.json'
const rows: any[] = []
const log = async (event: string, $: any, e: any, next: any) => {
  const row: any = { event, input: e }
  rows.push(row)
  const out = await next(e)
  row.result = out
  if (event === 'session.start' || e.changed?.includes('context')) row.usage = await $.session.usage({ breakdown: 'summary' })
  await $.fs.write(OUT, JSON.stringify(rows, null, 1))
  return out
}

export const register: Register = on => {
  on('session.start', ($, e: any, next: any) => log('session.start', $, e, next)).catch(($, e, next) => next(e))
  on('session.measure', ($, e: any, next: any) => log('session.measure', $, e, next)).catch(($, e, next) => next(e))
  on('classic.InstructionsLoaded', ($, e: any, next: any) => log('classic.InstructionsLoaded', $, e, next)).catch(($, e, next) => next(e))
}
