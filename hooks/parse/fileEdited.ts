// Pure: an Edit's or NotebookEdit's result becomes a `fileEdited` action, or null when nothing was written.
import type { FileEdited } from '../model/fileEdited'
import { importCandidates } from './imports'
import { count, countLines, type Hunk } from './measure'

type EditResult = { newString: string; structuredPatch: Hunk[]; staged?: boolean }
type NotebookResult = { new_source: string; old_source?: string; error?: string }

export function editAction(path: string, r: EditResult, cwd: string): FileEdited | null {
  if (r.staged) return null
  return { type: 'fileEdited', path, added: count(r.structuredPatch, '+'), removed: count(r.structuredPatch, '-'), line: r.structuredPatch[0]?.newStart ?? null, imports: importCandidates(r.newString, path, cwd) }
}

// A notebook has no patch, so `line` stays as it was.
export function notebookEditAction(path: string, r: NotebookResult): FileEdited | null {
  if (r.error) return null
  return { type: 'fileEdited', path, added: countLines(r.new_source), removed: countLines(r.old_source), line: null }
}
