// Pure: a re-attached file (F03-R3). The first line of a `file` attachment's text holds the Read call's input as JSON.
import type { Reattached } from '../model/reattached'
import { estimateTokens } from './measure'
import { normalize } from './path'

export function reattachedAction(text: string, cwd: string): Reattached | null {
  const json = /^Called the Read tool with the following input: (\{.*\})$/.exec(text.split('\n', 1)[0]!)?.[1]
  let input: any
  try { input = json && JSON.parse(json) } catch { return null }
  return typeof input?.file_path === 'string'
    ? { type: 'reattached', path: normalize(input.file_path, cwd), tokens: estimateTokens(text) } : null
}
