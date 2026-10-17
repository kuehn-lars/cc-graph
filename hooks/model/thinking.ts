// Pure: F05-R2, R3. One step's note from its collected thinking blocks and the tool uses its result lists.
import type { ThinkingNote } from '../../types'
import { normalize } from '../parse/path'

/** F05-R2: the most of a block, and of a note, kept (code points). */
const EXCERPT = 400
/** One block as the hook collects it: its first `EXCERPT` code points of text (`kept` of them), its full length, and whether all of it is whitespace. */
export type Block = { text: string; kept: number; chars: number; blank: boolean }
export const EMPTY_BLOCK: Block = { text: '', kept: 0, chars: 0, blank: true }
const SEP = '\n\n'

/** NFR-P2: `b` with one more chunk, in constant work. While the block is only whitespace that whitespace is not kept, so the excerpt starts at its text (F05-R2). */
export function addChunk(b: Block, text: string): Block {
  const cps = [...text]
  const add = (b.blank ? [...text.trimStart()] : cps).slice(0, EXCERPT - b.kept)
  return { text: b.text + add.join(''), kept: b.kept + add.length, chars: b.chars + cps.length, blank: b.blank && !/\S/.test(text) }
}

/** The blocks with text other than whitespace joined by a blank line and cut to `EXCERPT`; the files the step's tool uses name (I4, no duplicates). No text, no note. */
export function thinkingNote(blocks: Iterable<Block>, toolUses: readonly { input: unknown }[], cwd: string, turn: number, step: number): ThinkingNote | null {
  const kept = [...blocks].filter(b => !b.blank)
  if (!kept.length) return null
  const text = [...kept.map(b => b.text).join(SEP)].slice(0, EXCERPT).join('')
  const chars = kept.reduce((n, b) => n + b.chars, SEP.length * (kept.length - 1))
  const paths = toolUses.map(t => (t.input as { file_path?: unknown; notebook_path?: unknown } | null)).map(i => i?.file_path ?? i?.notebook_path)
  const files = [...new Set(paths.filter((p): p is string => typeof p === 'string').map(p => normalize(p, cwd)))]
  return { turn, step, text, chars, files }
}
