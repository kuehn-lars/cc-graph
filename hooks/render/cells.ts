// Pure: the cells of the card, a `Raster` of braille dots (F09-R12) and their packed form.
import type { Change, FileNode, Graph, Layout } from '../../types'
import { PRIORITY, canvas, type Canvas } from './canvas'
import { folderOf, seedPoint } from '../layout/seed'
import { cols } from './width'

export type Cell = [char: string, fg: number, bg: number]

/** `0x01000000`: the terminal's own color. */
export const DEFAULT = 0x01000000

// F09-R22: the card is dark in every theme, so the colours are fixed.
const CARD = 0x14161b, GRID = 0x262a31, IN_CONTEXT = 0x7aa7ff, SEARCH = 0x5fc4d6, GREY = 0x5f6672, GHOST = 0x7d8590, EDGE = 0x353a42, SELECTED = 0xf0f3f6, TEXT = 0xeef1f5, DIMMED = 0x9aa3ae

const COLOR = { read: IN_CONTEXT, partial: IN_CONTEXT, search: SEARCH, compacted: GREY, unread: GREY, ghost: GHOST }

/** `[codePoint, foreground, background]` per cell, little-endian u32, as standard padded base64. */
export const encode = (cells: Cell[]) =>
  (new Uint8Array(Uint32Array.from(cells.flatMap(([c, fg, bg]) => [c.codePointAt(0)!, fg, bg])).buffer) as Uint8Array & { toBase64(): string }).toBase64() // the engine has it, the es2023 lib does not

/** The ring of each change (F09-R15), named in the legend by its colour word. */
export const RING: Record<Change, { color: number; name: string }> = {
  edited: { color: 0xf0b45a, name: 'amber' }, created: { color: 0x63d494, name: 'green' }, external: { color: 0x9aa3ae, name: 'grey' }, blind: { color: 0xff6b72, name: 'red' },
}

/** F09-R17: what a change says on its node's label. */
const changeWord = (n: FileNode) => (n.change === 'edited' ? `+${n.added} −${n.removed}` : n.change === 'created' ? `+${n.added} new` : n.change === 'external' ? 'changed' : 'changed unseen')

/** The dots of a straight line between two dots, Bresenham. */
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

/** Whether the dot `(dx, dy)` from a centre lies on the circle of radius `r`, and within it. */
const onRing = (dx: number, dy: number, r: number) => Math.round(Math.hypot(dx, dy)) === r
const inside = (dx: number, dy: number, r: number) => Math.round(Math.hypot(dx, dy)) <= r

/** Every dot in the square of radius `r` around `(cx, cy)` that `pick` keeps. */
function stamp(c: Canvas, cx: number, cy: number, r: number, color: number, priority: number, pick: (dx: number, dy: number) => boolean) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (pick(dx, dy)) c.set(cx + dx, cy + dy, color, priority)
}

/** F09-R15: the dots of each state's shape. */
const SHAPE: Record<FileNode['state'], (dx: number, dy: number, r: number) => boolean> = {
  read: inside,
  partial: (dx, dy, r) => onRing(dx, dy, r) || (inside(dx, dy, r) && dx <= 0),
  search: () => false, // a dotted circle, drawn by `dotted`
  compacted: onRing,
  unread: (dx, dy, r) => dx === 0 && (dy <= r - 2 || dy === r),
  ghost: (dx, dy) => Math.abs(dx) === Math.abs(dy),
}

/** F09-R15: a circle of every other dot, counted round the ring so the gaps are even. */
function dotted(c: Canvas, cx: number, cy: number, r: number, color: number, priority: number) {
  const ring: [number, number][] = []
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (onRing(dx, dy, r)) ring.push([dx, dy])
  ring.sort(([ax, ay], [bx, by]) => Math.atan2(ay, ax) - Math.atan2(by, bx))
  ring.forEach(([dx, dy], i) => { if (i % 2 === 0) c.set(cx + dx, cy + dy, color, priority) })
}

type Placed = { node: FileNode; x: number; y: number; outer: number }

/** F09-R14: a dot of the area, from `t` dots off its centre; a node and its mirror image land on mirrored dots. */
const place = (t: number, size: number) => (t > 0 ? size / 2 + Math.ceil(t) - 1 : size / 2 + Math.floor(t))

/**
 * `columns × rows` cells: the card (F09-R12), the file nodes as shapes at their positions in `layout`, else at their folder's seed point (F09-R9), fitted to the dot area (R14), joined by dotted import edges (R16).
 * Every node is labelled (R17). A node in `pulse` wears a white ring 4 dots outside its outermost ring (R19).
 */
export function paint(graph: Graph, layout: Layout, columns: number, rows: number, selected: string | null = null, pulse: string[] = []): Cell[] {
  const files = Object.values(graph.files)
  const W = (columns - 2) * 2, H = (rows - 2) * 4
  const dots = canvas(Math.max(W, 0), Math.max(H, 0))
  const placed = new Map<string, Placed>()
  if (W > 0 && H > 0 && files.length) {
    const at = files.map(n => layout[n.path] ?? seedPoint(folderOf(n.path)))
    const xs = at.map(p => p.x), ys = at.map(p => p.y)
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const scale = Math.min(W / Math.max(maxX - minX + 16, 40), H / Math.max(maxY - minY + 16, 26)) // F09-R14: one scale on both axes, centred
    const biggest = Math.max(1, ...files.map(n => n.tokens ?? 0))
    files.forEach((node, i) => {
      const base = node.state === 'ghost' ? 2 : node.tokens === null ? 3 : 2 + Math.round(7 * Math.sqrt(node.tokens / biggest))
      const r = columns < 84 ? Math.max(2, Math.round(base * columns / 84)) : base
      const changeAt = r + 3, outer = node.path !== selected ? (node.change ? changeAt : r) : node.change ? changeAt + 2 : changeAt // F09-R15: the change ring 3 dots out, the selected ring 2 further out (or 3 without a change)
      const fit = (v: number, size: number) => (size - 1 - outer < outer ? v : Math.min(Math.max(v, outer), size - 1 - outer)) // the outermost ring stays inside
      const x = fit(place((at[i]!.x - (minX + maxX) / 2) * scale, W), W), y = fit(place((at[i]!.y - (minY + maxY) / 2) * scale, H), H)
      placed.set(node.path, { node, x, y, outer })
      if (node.state === 'search') dotted(dots, x, y, r, SEARCH, PRIORITY.body)
      else stamp(dots, x, y, r, COLOR[node.state], PRIORITY.body, (dx, dy) => SHAPE[node.state](dx, dy, r))
      const ring = (radius: number, color: number, priority: number) => stamp(dots, x, y, radius, color, priority, (dx, dy) => onRing(dx, dy, radius))
      if (node.change) ring(changeAt, RING[node.change].color, PRIORITY.change)
      if (node.path === selected) ring(outer, SELECTED, PRIORITY.selected)
    })
    for (const e of graph.edges) {
      const a = placed.get(e.from), b = placed.get(e.to)
      if (e.kind !== 'import' || !a || !b) continue
      const d = Math.hypot(b.x - a.x, b.y - a.y), [ua, ub] = [a.outer + 3, b.outer + 3]
      if (d <= ua + ub) continue // the rings meet: no room for a line
      const [ux, uy] = [(b.x - a.x) / d, (b.y - a.y) / d]
      let i = 0
      for (const [x, y] of line([Math.round(a.x + ux * ua), Math.round(a.y + uy * ua)], [Math.round(b.x - ux * ub), Math.round(b.y - uy * ub)])) if (i++ % 2 === 0) dots.set(x, y, EDGE, PRIORITY.edge)
    }
    for (const path of pulse) {
      const p = placed.get(path)
      if (p) stamp(dots, p.x, p.y, p.outer + 4, SELECTED, PRIORITY.selected, (dx, dy) => onRing(dx, dy, p.outer + 4))
    }
  }
  // The card: half-block corners on the terminal's background, the card colour behind every other cell, a sparse grid where no dot is lit.
  const cells: Cell[] = Array.from({ length: columns * rows }, (_, i) => {
    const col = i % columns, row = Math.floor(i / columns)
    if (row === 0) return [col === 0 ? '▗' : col === columns - 1 ? '▖' : '▄', CARD, DEFAULT]
    if (row === rows - 1) return [col === 0 ? '▝' : col === columns - 1 ? '▘' : '▀', CARD, DEFAULT]
    if (col === 0 || col === columns - 1) return [' ', DEFAULT, CARD]
    const { char, color } = dots.cell(col - 1, row - 1)
    if (char) return [char, color, CARD]
    return (col - 1) % 4 === 0 && (row - 1) % 2 === 0 ? ['·', GRID, CARD] : [' ', DEFAULT, CARD]
  })
  // Labels last (F09-R17): a label covers edge dots and the grid, never a node's dots or another label (NFR-A3).
  const now = files.filter(n => n.state !== 'ghost').reduce<FileNode | null>((top, n) => (!top || n.touched > top.touched ? n : top), null)
  const rank = (n: FileNode) => (n.path === selected ? 0 : n === now ? 1 : n.change ? 2 : 3)
  const order = [...placed.values()].sort((a, b) => rank(a.node) - rank(b.node) || (rank(a.node) === 2 ? b.node.touched - a.node.touched : (b.node.tokens ?? 0) - (a.node.tokens ?? 0)) || (a.node.path < b.node.path ? -1 : 1))
  const busy = new Set<number>()
  for (const { node, x, y, outer } of order) {
    const name = [...node.path.slice(node.path.lastIndexOf('/') + 1)].map(c => (cols(c) === 1 && c.codePointAt(0)! <= 0xffff ? c : '?'))
    const label: [string, number][] = name.map(c => [c, node.state === 'read' || node.state === 'partial' || node.state === 'search' ? TEXT : DIMMED])
    if (node.change) label.push(...[...`  ${changeWord(node)}`].map(c => [c, RING[node.change!].color] as [string, number]))
    const row = Math.floor(y / 4)
    // the right side first, then the left
    for (const start of [Math.floor((x + outer) / 2) + 2, Math.floor((x - outer) / 2) - 2 - label.length + 1]) {
      if (start < 0 || start + label.length > columns - 2) continue
      const span = label.map((_, i) => row * columns + start + i)
      if (span.some((at, i) => busy.has(at) || dots.cell(start + i, row).priority >= PRIORITY.halo)) continue
      span.forEach(at => busy.add(at))
      label.forEach(([c, fg], i) => { cells[(row + 1) * columns + start + i + 1] = [c, fg, CARD] })
      break
    }
  }
  return cells
}
