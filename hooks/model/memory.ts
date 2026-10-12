// Pure: a loaded memory file replaces its note in place, or is added last (F04-R3).
import type { MemoryNote } from '../../types'

export const loaded = (notes: MemoryNote[], note: MemoryNote): MemoryNote[] =>
  notes.some(n => n.path === note.path) ? notes.map(n => (n.path === note.path ? note : n)) : [...notes, note]
