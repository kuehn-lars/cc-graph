// Pure: a re-attached file (F03-R3). The first line of a `file` attachment's text holds the Read call's input as JSON.
import type { Reattached } from '../model/reattached'
import { estimateTokens } from './measure'
import { normalize } from './path'

export function reattachedAction(text: string, cwd: string): Reattached | null {
  const json = /^Called the Read tool with the following input: (\{.*\})$/.exec(text.split('\n', 1)[0]!)?.[1]
  let input: unknown
  try { input = json && JSON.parse(json) } catch { return null }
  const file = typeof input === 'object' && input !== null && 'file_path' in input ? input.file_path : null
  return typeof file === 'string'
    ? { type: 'reattached', path: normalize(file, cwd), tokens: estimateTokens(text) } : null
}
