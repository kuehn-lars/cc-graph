// Pure: a Write's result becomes a `fileWritten` action, or null when staged.
import type { FileWritten } from '../model/fileWritten'
import { importCandidates } from './imports'
import { count, countLines, estimateTokens, type Hunk } from './measure'

type WriteResult = { type: 'create' | 'update'; content: string; structuredPatch: Hunk[]; staged?: boolean }

export function writeAction(path: string, r: WriteResult, cwd: string, edges = true): FileWritten | null {
  if (r.staged) return null
  const created = r.type === 'create'
  // F01-R6: an empty patch counts the content's lines for a create only.
  const whole = created && r.structuredPatch.length === 0
  return {
    type: 'fileWritten', path, created, tokens: estimateTokens(r.content),
    added: whole ? countLines(r.content) : count(r.structuredPatch, '+'),
    removed: count(r.structuredPatch, '-'), line: r.structuredPatch[0]?.newStart ?? 1,
    imports: edges ? importCandidates(r.content, path, cwd) : undefined,
  }
}
