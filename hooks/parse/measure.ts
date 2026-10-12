// Pure: the counting every parser shares, so one rule holds everywhere.
export type Hunk = { newStart: number; lines: string[] }

/** F01-R6: the lines of a text. "" has none, and one trailing newline does not start another. */
export const countLines = (s = '') => (s === '' ? 0 : s.split('\n').length - (s.endsWith('\n') ? 1 : 0))

/** The `+` or `-` lines of a patch. */
export const count = (hunks: Hunk[], sign: '+' | '-') => hunks.reduce((n, h) => n + h.lines.filter(l => l[0] === sign).length, 0)

/** F01-R1: the pane's size estimate. */
export const estimateTokens = (s: string) => Math.ceil(s.length / 4)

/** "1 line", "2 lines". */
export const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`
