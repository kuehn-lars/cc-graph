// Pure: the footer note for I5's "the cap is exceeded". The cap note is the only one written yet (F14-AC8).
const CAP = / over the cap of \d+$/

/** The notes with the cap note replaced by the current count, or dropped when the graph is within the cap; `notes` itself when that changes nothing. */
export function withCapNote(notes: string[], files: number, max: number): string[] {
  const over = files - max
  const note = over > 0 ? `${over} ${over === 1 ? 'file' : 'files'} over the cap of ${max}` : undefined
  if (notes.find(n => CAP.test(n)) === note) return notes
  return [...notes.filter(n => !CAP.test(n)), ...(note ? [note] : [])]
}
