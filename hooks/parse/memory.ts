// Pure: a `classic.InstructionsLoaded` input becomes a memory note (F04-R3).
import type { MemoryNote } from '../../types'
import { normalize } from './path'

const REASON = { session_start: 'at start', nested_traversal: 'nested', path_glob_match: 'path rule', include: 'import', compact: 'after compaction' } as const

export const memoryNote = (e: { file_path: string; memory_type: string; load_reason: string }, cwd: string): MemoryNote =>
  ({ path: normalize(e.file_path, cwd), type: e.memory_type, tokens: null, reason: REASON[e.load_reason as keyof typeof REASON] ?? null })
