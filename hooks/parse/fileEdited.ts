// Pure: an Edit's or NotebookEdit's result becomes a `fileEdited` action, or null when nothing was written.
import type { FileEdited } from '../model/fileEdited'

export type Hunk = { newStart: number; lines: string[] }
type EditResult = { structuredPatch: Hunk[]; staged?: boolean }
type NotebookResult = { new_source: string; old_source?: string; error?: string }

export const count =(hunks: Hunk[], sign: '+' | '-') => hunks.reduce((n, h) => n + h.lines.filter(l => l[0] === sign).length, 0)
const lines = (s = '') => (s === '' ? 0 : s.split('\n').length)

export function editAction(path: string, r: EditResult): FileEdited | null {
  if (r.staged) return null
  return { type: 'fileEdited', path, added: count(r.structuredPatch, '+'), removed: count(r.structuredPatch, '-'), line: r.structuredPatch[0]?.newStart ?? null }
}

// A notebook has no patch, so `line` stays as it was.
export function notebookEditAction(path: string, r: NotebookResult): FileEdited | null {
  if (r.error) return null
  return { type: 'fileEdited', path, added: lines(r.new_source), removed: lines(r.old_source), line: null }
}
