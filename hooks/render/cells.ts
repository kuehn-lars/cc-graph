// Pure: the cells of a `Raster` (F09-R1) and their packed form.
import type { Change, Graph, Layout, MemoryNote, NodeState } from '../../types'
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

/** The ring of each change: the cell's background, named in the legend by its colour word (F09-R5, R8). */
export const RING: Record<Change, { color: number; name: string }> = {
  edited: { color: 0xd29922, name: 'amber' }, created: { color: 0x3fb950, name: 'green' }, external: { color: 0x8b949e, name: 'grey' }, blind: { color: 0xf85149, name: 'red' },
}

// Memory files: lighter than any state's glyph, so the row reads as apart.
const MEMORY = 0xc9d1d9

// Import edges: a grey quieter than any state's glyph.
const EDGE = 0x768390

/** The cells a straight line of half-block pixels covers from pixel `a` to pixel `b` (F09-R5). Bresenham, in pixels: `rows × 2` of them tall. */
function* line([x0, y0]: [number, number], [x1, y1]: [number, number]) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
  for (let err = dx + dy; ; ) {
    yield [x0, y0] as const
    if (x0 === x1 && y0 === y1) return
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; x0 += sx }
    if (e2 <= dx) { err += dx; y0 += sy }
  }
}

/**
 * `columns × rows` cells: import edges as half-block pixels, every file node its list glyph on top (in its ring, if changed) at its position in `layout`, else at its folder's seed point (F09-R5, R9), and the memory files as `■` along the bottom-left.
 * ponytail: a node whose cell is taken moves to the next free one, row-major; the layout keeps nodes apart in units, not in cells.
 */
export function paint(graph: Graph, layout: Layout, memory: MemoryNote[], columns: number, rows: number): Cell[] {
  const cells: Cell[] = Array.from({ length: columns * rows }, () => [' ', DEFAULT, DEFAULT])
  const taken = new Map<string, number>(), used = new Set<number>()
  const paths = memory.map(n => n.path).sort().slice(0, columns) // path order; a row wider than the raster is cut
  const memoryAt = (i: number) => (rows - 1) * columns + i
  paths.forEach((_, i) => used.add(memoryAt(i))) // nodes keep off them
  for (const n of Object.values(graph.files)) {
    const { x, y } = layout[n.path] ?? seedPoint(folderOf(n.path))
    if (used.size === cells.length) break // more files than cells: the rest are not drawn
    let at = Math.min(rows - 1, Math.floor((y / CANVAS.height) * rows)) * columns + Math.min(columns - 1, Math.floor((x / CANVAS.width) * columns))
    while (used.has(at)) at = (at + 1) % cells.length
    used.add(at)
    taken.set(n.path, at)
  }
  // Pixels first, so the glyphs stay on top. A cell's top pixel is its foreground and its bottom pixel its background; a lone bottom pixel is `▄`, since `▀` would paint the unlit top in the terminal's foreground.
  const top = new Set<number>(), bottom = new Set<number>()
  const pixel = (path: string): [number, number] => [taken.get(path)! % columns, Math.floor(taken.get(path)! / columns) * 2]
  for (const e of graph.edges)
    if (e.kind === 'import' && taken.has(e.from) && taken.has(e.to))
      for (const [x, y] of line(pixel(e.from), pixel(e.to))) (y % 2 ? bottom : top).add(Math.floor(y / 2) * columns + x)
  for (const at of new Set([...top, ...bottom]))
    cells[at] = top.has(at) ? ['▀', EDGE, bottom.has(at) ? EDGE : DEFAULT] : ['▄', EDGE, DEFAULT]
  for (const [path, at] of taken) {
    const n = graph.files[path]!
    cells[at] = [GLYPH[n.state], STATE_COLOR[n.state], n.change ? RING[n.change].color : DEFAULT]
  }
  paths.forEach((_, i) => { cells[memoryAt(i)] = ['■', MEMORY, DEFAULT] })
  return cells
}
