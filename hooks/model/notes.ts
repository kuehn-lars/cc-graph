// Pure: the footer notes for I5's "the cap is exceeded" (F14-AC8) and for hidden thinking (F05-R6).
const CAP = / over the cap of \d+$/

/** The notes with the cap note replaced by the current count, or dropped when the graph is within the cap; `notes` itself when that changes nothing. */
export function withCapNote(notes: string[], files: number, max: number): string[] {
  const over = files - max
  const note = over > 0 ? `${over} ${over === 1 ? 'file' : 'files'} over the cap of ${max}` : undefined
  if (notes.find(n => CAP.test(n)) === note) return notes
  return [...notes.filter(n => !CAP.test(n)), ...(note ? [note] : [])]
}

/** F05-R6: the footer note of thinking that streams without text. */
const HIDDEN = 'Thinking is hidden: turn on showThinkingSummaries to see it.'

/** F05-R5, R6, R9: the notes with the hidden note once while `hidden`, without it otherwise; `notes` itself when that changes nothing. */
export function withHiddenNote(notes: string[], hidden: boolean): string[] {
  if (notes.includes(HIDDEN) === hidden) return notes
  return hidden ? [...notes, HIDDEN] : notes.filter(n => n !== HIDDEN)
}
