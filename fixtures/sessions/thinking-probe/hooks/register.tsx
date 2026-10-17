// Throwaway recording probe for spike S2 (specs/features/F05-thinking-layer/spike-s2.md). Not part of the mod.
// It logs session.start, turn.start (with agentId) and every turn.step: its input, each chunk as it streams, and the result.
import type { Register } from 'claude-code'

const OUT = '/tmp/cc-graph-thinking/log-' + Date.now() + '.json'
const rows: any[] = []
const dump = ($: any) => $.fs.write(OUT, JSON.stringify(rows, null, 1))

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const out = await next(e)
    rows.push({ event: 'session.start', input: e, result: out })
    await dump($)
    return out
  }).catch(($, e, next) => next(e))
  on('turn.start', async ($, e, next) => {
    const out = await next(e)
    rows.push({ event: 'turn.start', input: e, result: out })
    await dump($)
    return out
  }).catch(($, e, next) => next(e))
  on('turn.step', async function* ($, e, next) {
    const row: any = { event: 'turn.step', input: e, chunks: [] }
    rows.push(row)
    const stream = next(e)
    for await (const c of stream) {
      row.chunks.push(c)
      yield c
    }
    row.result = await stream.result
    await dump($)
    return row.result
  })
}
