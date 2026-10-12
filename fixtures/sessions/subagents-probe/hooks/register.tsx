// Throwaway recording probe for fixtures/sessions/subagents.ts (see ../../README.md). Not part of the mod.
// It logs tool.call (with the next(e) result), agent.spawn, turn.start and session.start as the hooks see them, plus the rows
// of $.agent.list() after each spawn and at each subagent's first tool.call.
import type { Register } from 'claude-code'

const OUT = '/tmp/cc-graph-subagents/log-' + Date.now() + '.json'
const rows: any[] = []
const seen = new Set<string>()
const open = (event: string, input: any) => { const row: any = { event, input }; rows.push(row); return row }
const dump = ($: any) => $.fs.write(OUT, JSON.stringify(rows, null, 1))
const log = async (event: string, $: any, e: any, next: any) => {
  const row = open(event, e)
  if (event === 'tool.call' && e.agentId && !seen.has(e.agentId)) { seen.add(e.agentId); row.agentListAtFirstCall = await $.agent.list() }
  const out = await next(e)
  row.result = out
  if (event === 'agent.spawn') row.agentListAfterSpawn = await $.agent.list()
  await dump($)
  return out
}

export const register: Register = on => {
  on('session.start', ($, e: any, next: any) => log('session.start', $, e, next)).catch(($, e, next) => next(e))
  on('turn.start', ($, e: any, next: any) => log('turn.start', $, e, next)).catch(($, e, next) => next(e))
  on('agent.spawn', ($, e: any, next: any) => log('agent.spawn', $, e, next)).catch(($, e, next) => next(e))
  on('tool.call', ($, e: any, next: any) => log('tool.call', $, e, next)).catch(($, e, next) => next(e))
}
