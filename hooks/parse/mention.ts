// Pure: a `prompt.mention` result becomes a `mention` action, or null when nothing was attached.
import type { Mention } from '../model/mention'

export function mentionAction(path: string, e: { offset?: number; limit?: number }, type: string | null): Mention | null {
  if (type === 'pdf_reference') return { type: 'mention', path, state: 'ghost', seen: 'mentioned PDF, not attached' }
  if (type !== 'file' && type !== 'already_read_file') return null
  if (e.offset === undefined && e.limit === undefined) return { type: 'mention', path, state: 'read', seen: 'mentioned by you' }
  const from = e.offset ?? 1
  const range = e.limit === undefined ? `from line ${from}` : `lines ${from} to ${from + e.limit - 1}`
  return { type: 'mention', path, state: 'partial', seen: `${range}, mentioned by you` }
}
