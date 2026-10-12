// Pure: a loaded memory file replaces its note in place, or is added last (F04-R3).
import type { MemoryNote } from '../../types'

export const loaded = (notes: MemoryNote[], note: MemoryNote): MemoryNote[] =>
  notes.some(n => n.path === note.path) ? notes.map(n => (n.path === note.path ? note : n)) : [...notes, note]

// Loaded mid-conversation, the breakdown never lists them (F04-R1).
const KEPT = new Set(['nested', 'path rule', 'import'])

/** F04-R1: the notes the breakdown lists replace the old ones, keeping a listed note's reason; an unlisted mid-conversation note stays with its tokens. */
export const refreshed = (notes: MemoryNote[], files: MemoryNote[]): MemoryNote[] => [
  ...files.map(f => ({ ...f, reason: notes.find(n => n.path === f.path)?.reason ?? null })),
  ...notes.filter(n => !files.some(f => f.path === n.path) && n.reason && KEPT.has(n.reason)),
]

/** F04-R6: the size of one note; no such note, no change. */
export const sized = (notes: MemoryNote[], path: string, tokens: number): MemoryNote[] =>
  notes.map(n => (n.path === path ? { ...n, tokens } : n))
