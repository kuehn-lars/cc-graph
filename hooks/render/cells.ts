// Pure: the cells of a `Raster` (F09-R1) and their packed form.
import type { Graph, NodeState } from '../../types'
import { CANVAS, folderOf, seedPoint } from '../layout/seed'
import { GLYPH } from './list'

export type Cell = [char: string, fg: number, bg: number]

/** `0x01000000`: the terminal's own color. */
export const DEFAULT = 0x01000000

// The colour of each state's glyph. No state is told by colour alone: the glyph says it too (NFR-A1).
const STATE_COLOR: Record<NodeState, number> = {
  read: 0x58a6ff, partial: 0x58a6ff, search: 0x56d4dd, compacted: 0x6e7681, unread: 0xf85149, ghost: 0x8b949e,
}

/** `[codePoint, foreground, background]` per cell, little-endian u32, as standard padded base64. */
export const encode = (cells: Cell[]) =>
  (new Uint8Array(Uint32Array.from(cells.flatMap(([c, fg, bg]) => [c.codePointAt(0)!, fg, bg])).buffer) as Uint8Array & { toBase64(): string }).toBase64() // the engine has it, the es2023 lib does not

/**
 * `columns × rows` cells: every file node its list glyph at its folder's seed point (F09-R9, until a layout has placed it).
 * ponytail: a node whose cell is taken moves to the next free one, row-major; the layout (ticket 02) replaces this.
 */
export function paint(graph: Graph, columns: number, rows: number): Cell[] {
  const cells: Cell[] = Array.from({ length: columns * rows }, () => [' ', DEFAULT, DEFAULT])
  const taken = new Set<number>()
  for (const n of Object.values(graph.files)) {
    const { x, y } = seedPoint(folderOf(n.path))
    if (taken.size === cells.length) break // more files than cells: the rest are not drawn
    let at = Math.floor((y / CANVAS.height) * rows) * columns + Math.floor((x / CANVAS.width) * columns)
    while (taken.has(at)) at = (at + 1) % cells.length
    taken.add(at)
    cells[at] = [GLYPH[n.state], STATE_COLOR[n.state], DEFAULT]
  }
  return cells
}
