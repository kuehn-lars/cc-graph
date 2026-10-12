// Pure: a `classic.InstructionsLoaded` input becomes a memory note (F04-R3).
import type { MemoryNote } from '../../types'
import { estimateTokens } from './measure'
import { normalize } from './path'

const REASON = { session_start: 'at start', nested_traversal: 'nested', path_glob_match: 'path rule', include: 'import', compact: 'after compaction' } as const

export const memoryNote = (e: { file_path: string; memory_type: string; load_reason: string }, cwd: string): MemoryNote =>
  ({ path: normalize(e.file_path, cwd), type: e.memory_type, tokens: null, reason: REASON[e.load_reason as keyof typeof REASON] ?? null })

/** F04-R1: the memory files a usage breakdown lists, as notes without a reason. */
export const listed = (files: Omit<MemoryNote, 'reason'>[], cwd: string): MemoryNote[] =>
  files.map(f => ({ path: normalize(f.path, cwd), type: f.type, tokens: f.tokens, reason: null }))

/** F04-R6: the path in the first line of a nested file's attachment ("Contents of <path>:"), and the estimate of the whole text. */
export const nestedSize = (text: string, cwd: string) => {
  const path = /^Contents of (.+):\n/.exec(text)?.[1]
  return path ? { path: normalize(path, cwd), tokens: estimateTokens(text) } : null
}
