// Pure: F05-R2, R3. One step's note from its collected thinking blocks and the tool uses its result lists.
import type { ThinkingNote } from '../../types'
import { normalize } from '../parse/path'

/** F05-R2: the most of a block, and of a note, kept (code points). */
export const EXCERPT = 400
/** One block as the hook collects it: its first `EXCERPT` code points and its full length. */
export type Block = { text: string; chars: number }
const SEP = '\n\n'

/** The non-empty blocks joined by a blank line and cut to `EXCERPT`; the files the step's tool uses name (I4, no duplicates). No text, no note. */
export function thinkingNote(blocks: Iterable<Block>, toolUses: readonly { input: unknown }[], cwd: string, turn: number, step: number): ThinkingNote | null {
  const kept = [...blocks].filter(b => b.chars > 0)
  if (!kept.length) return null
  const text = [...kept.map(b => b.text).join(SEP)].slice(0, EXCERPT).join('')
  const chars = kept.reduce((n, b) => n + b.chars, SEP.length * (kept.length - 1))
  const paths = toolUses.map(t => (t.input as { file_path?: unknown; notebook_path?: unknown } | null)).map(i => i?.file_path ?? i?.notebook_path)
  const files = [...new Set(paths.filter((p): p is string => typeof p === 'string').map(p => normalize(p, cwd)))]
  return { turn, step, text, chars, files }
}
