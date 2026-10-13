// Throwaway recording probe for fixtures/sessions/imports.ts (see ../../README.md). Not part of the mod.
// It logs session.start, turn.start and every tool.call as the hooks see them, and changes nothing.
import type { Register } from 'claude-code'

const OUT = '/tmp/cc-graph-imports/log-' + Date.now() + '.json'
const rows: any[] = []
const log = async ($: any, event: string, e: any, next: any) => {
  const row: any = { event, input: e }
  rows.push(row)
  const out = await next(e)
  row.result = out
  await $.fs.write(OUT, JSON.stringify(rows, null, 1))
  return out
}

export const register: Register = on => {
  on('session.start', ($, e: any, next: any) => log($, 'session.start', e, next)).catch(($, e, next) => next(e))
  on('turn.start', ($, e: any, next: any) => log($, 'turn.start', e, next)).catch(($, e, next) => next(e))
  on('tool.call', ($, e: any, next: any) => log($, 'tool.call', e, next)).catch(($, e, next) => next(e))
}
