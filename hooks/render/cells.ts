// Pure: the cells of the graph, a `Raster` of boxes joined by box-drawing lines (F09-R23..R27), and their packed form.
import type { Graph, Layout } from '../../types'
import { fileName } from '../layout/seed'
import { CHANGE_TONE, STATE_TONE, TONE, nowNode, solid } from './palette'
import { DEFAULT, place, type Placed } from './place'

/** `[codePoint, foreground, background]` per cell, row-major, three words a cell: the Raster's own layout. */
type Cells = Uint32Array

// Box drawing by the directions a cell joins: up 1, down 2, left 4, right 8 (F09-R26).
const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8
const LINE = '│││─╯╮┤─╰╭├─┴┬┼' // by directions − 1
const DASH: Record<string, string> = { '│': '╎', '─': '╌' } // F09-R26: a blind edge's straight runs
const SOLID = { h: '─', v: '│' }, DASHED = { h: '┄', v: '┆' }

/** F09-R27: the pulse's border colour, by step; the plain frame after it. */
const PULSE = [TONE.text.rgb, TONE.shimmer.rgb, TONE.claude.rgb]

/** The cells as little-endian u32s, as standard padded base64. */
export const encode = (cells: Cells) => (new Uint8Array(cells.buffer) as Uint8Array & { toBase64(): string }).toBase64() // the engine has it, the es2023 lib does not

/**
 * `columns × rows` cells on the terminal's own background (F09-R23): the folders' frames and boxes where `place` puts them (R24, R30), joined by box-drawing import edges (R26).
 * The focus, the selected node or else the now node, has a border in Claude's colour and lights its edges (R24, R26). A node in `pulse` has the pulse's border colour for `step` (R27).
 */
export function paint(graph: Graph, layout: Layout, columns: number, rows: number, selected: string | null, pulse: string[], step: number): Cells {
  const cells: Cells = new Uint32Array(columns * rows * 3)
  cells.set([32, DEFAULT, DEFAULT]) // a space on the terminal's own colours, copied over the rest in doubling runs
  for (let n = 3; n < cells.length; n *= 2) cells.copyWithin(n, 0, Math.min(n, cells.length - n))
  const set = (i: number, c: string, fg: number) => { cells[i * 3] = c.codePointAt(0)!; cells[i * 3 + 1] = fg }
  const files = Object.values(graph.files)
  if (!files.length) return cells
  const focus = selected !== null && graph.files[selected] ? selected : nowNode(graph)?.path ?? null // a selection that left the graph falls back to the now node
  const { placed, frames } = place(graph, layout, columns, rows, focus)

  // What a line goes around: the cells of boxes and tags, and less so the frames' sides (a line crosses a side, never runs along one).
  const taken = new Uint8Array(columns * rows)
  const frame = new Uint8Array(columns * rows) // the directions of each frame cell, joined into the lines that cross it
  for (const p of placed.values()) for (let y = p.top; y < p.top + p.h; y++) taken.fill(4, y * columns + p.left, y * columns + p.left + p.w) // a box hides a line, a side only crosses it
  const boxes = taken.slice()
  const sides: number[] = [] // every frame cell, to draw
  const side = (i: number, d: number) => { frame[i] = d; taken[i] = 1; sides.push(i) }
  for (const { g, left, top } of frames) {
    const r = left + g.w - 1, b = top + g.h - 1
    for (let x = left + 1; x < r; x++) { side(top * columns + x, LEFT | RIGHT); side(b * columns + x, LEFT | RIGHT) }
    for (let y = top + 1; y < b; y++) { side(y * columns + left, UP | DOWN); side(y * columns + r, UP | DOWN) }
    side(top * columns + left, DOWN | RIGHT); side(top * columns + r, DOWN | LEFT); side(b * columns + left, UP | RIGHT); side(b * columns + r, UP | LEFT)
  }
  for (const { g, left, top } of frames) taken.fill(4, top * columns + left + 2, top * columns + left + 2 + g.title.length) // a title hides a line as a box does

  // F09-R26: each import edge an orthogonal line between its ends' facing sides; where lines meet, the box-drawing character of all their directions.
  const joins = new Uint8Array(columns * rows), lit = new Uint8Array(columns * rows), unseen = new Uint8Array(columns * rows) // unseen: a blind edge passes (dashed, error colour)
  const ends: { p: Placed; x: number; y: number; dir: number }[] = []
  const joined: number[] = [] // every line cell, to draw
  const join = (x: number, y: number, dir: number, on: boolean, blind: boolean) => {
    if (x < 0 || y < 0 || x >= columns || y >= rows) return
    const i = y * columns + x
    if (!joins[i]) joined.push(i)
    joins[i]! |= dir
    if (on) lit[i] = 1
    if (blind) unseen[i] = 1
  }
  const run = (path: [number, number][], on: boolean, blind: boolean) => {
    for (let k = 1; k < path.length; k++) {
      let [x, y] = path[k - 1]!
      const [tx, ty] = path[k]!
      while (x !== tx || y !== ty) {
        const dx = Math.sign(tx - x), dy = Math.sign(ty - y)
        join(x, y, dx > 0 ? RIGHT : dx < 0 ? LEFT : dy > 0 ? DOWN : UP, on, blind)
        x += dx; y += dy
        join(x, y, dx > 0 ? LEFT : dx < 0 ? RIGHT : dy > 0 ? UP : DOWN, on, blind)
      }
    }
  }
  // What a run costs: the box and side cells it crosses, counted along each row and each column, so a run costs two lookups.
  const alongRow = new Int32Array((columns + 1) * rows), alongColumn = new Int32Array(columns * (rows + 1))
  for (let y = 0, i = 0; y < rows; y++) for (let x = 0, sum = 0, r = y * (columns + 1) + 1; x < columns; x++, i++) alongRow[r + x] = sum += taken[i]!
  for (let x = 0; x < columns; x++) for (let y = 0, sum = 0, c = x * (rows + 1) + 1; y < rows; y++) alongColumn[c + y] = sum += taken[y * columns + x]!
  const down = (x: number, a: number, b: number) => alongColumn[x * (rows + 1) + Math.max(a, b) + 1]! - alongColumn[x * (rows + 1) + Math.min(a, b)]! // column x from row a to b
  for (const e of graph.edges) {
    const a = placed.get(e.from), b = placed.get(e.to)
    if (e.kind !== 'import' || !a || !b) continue
    const on = e.from === focus || e.to === focus
    // F09-R30: an importer's layer is above what it imports, so one end is always above the other (a link that closes a cycle points up): from the middle of the bottom side down to the top side.
    const [upper, lower] = a.top + a.h < b.top ? [a, b] : b.top + b.h < a.top ? [b, a] : [null, null]
    if (!upper || !lower) continue
    // It enters the top side at the middle, a quarter or an end, and turns on the row, whose path crosses the fewest cells; of those the column nearest the middle and the highest row, so the edges of one node leave it together and a line can pass a box in the way.
    const x0 = upper.left + (upper.w >> 1), y0 = upper.top + upper.h, y1 = lower.top - 1, centre = lower.left + (lower.w >> 1)
    let x1 = centre, mid = y0, fewest = Infinity
    const first = lower.left + (lower.boxed ? 1 : 0), last = lower.left + lower.w - (lower.boxed ? 2 : 1)
    for (const x of [centre, (first + centre) >> 1, (centre + last + 1) >> 1, first, last]) { // the middle, the quarters, the ends
      if (x !== centre && fewest < 4) break // the middle crosses no box: nothing to slip past
      // Down from x0, across row m, down to y1, by the sums inlined: every run is inside the raster, and this loop is most of a frame's time.
      const c0 = x0 * (rows + 1), c1 = x * (rows + 1), lo = Math.min(x0, x), hi = Math.max(x0, x) + 1
      for (let m = y0; m <= y1; m++) {
        const r = m * (columns + 1)
        const n = alongColumn[c0 + m + 1]! - alongColumn[c0 + y0]! + alongRow[r + hi]! - alongRow[r + lo]! + alongColumn[c1 + y1 + 1]! - alongColumn[c1 + m]!
        if (n < fewest || (n === fewest && Math.abs(x - centre) < Math.abs(x1 - centre))) { x1 = x; mid = m; fewest = n }
      }
    }
    let path: [number, number][] = [[x0, y0], [x0, mid], [x1, mid], [x1, y1]]
    // F09-R26: a line that crosses more than it must goes round instead: out under its own folder, along the clearest column (the nearest of those), and in over the other's.
    const out = upper.frame.bottom + 1, into = lower.frame.top - 1
    if (out < into && fewest > down(x0, y0, out) + down(x1, into, y1) + 2) {
      let c = x0, round = Infinity
      const both = down(x0, y0, out) + down(x1, into, y1), ro = out * (columns + 1), ri = into * (columns + 1)
      for (let x = 0; x < columns; x++) { // across row out, down column x, across row into, inlined
        const cx = x * (rows + 1)
        const n = both + alongRow[ro + Math.max(x0, x) + 1]! - alongRow[ro + Math.min(x0, x)]! + alongColumn[cx + into + 1]! - alongColumn[cx + out]! + alongRow[ri + Math.max(x, x1) + 1]! - alongRow[ri + Math.min(x, x1)]!
        if (n < round || (n === round && Math.abs(x - x0) < Math.abs(c - x0))) { c = x; round = n }
      }
      if (round < fewest) path = [[x0, y0], [x0, out], [c, out], [c, into], [x1, into], [x1, y1]]
    }
    join(x0, y0, UP, on, e.blind); join(x1, y1, DOWN, on, e.blind)
    run(path, on, e.blind)
    ends.push({ p: upper, x: x0, y: y0 - 1, dir: DOWN }, { p: lower, x: x1, y: y1 + 1, dir: UP })
  }
  // F09-R30: the frames under the lines; where a line crosses a side, the side joins it (`┼`), in the line's colour. A box covers any line beneath it.
  for (const i of sides) set(i, LINE[frame[i]! - 1]!, TONE.subtle.rgb)
  // F09-R26: a blind edge is dashed (`╌ ╎`) in the error colour, which wins over the focus's.
  for (const i of joined) if (!boxes[i]) {
    const line = LINE[(joins[i]! | frame[i]!) - 1]!
    set(i, unseen[i] ? DASH[line] ?? line : line, unseen[i] ? TONE.blind.rgb : lit[i] ? TONE.claude.rgb : TONE.subtle.rgb)
  }
  // The title over all of it, after `╭─`.
  for (const { g, left, top } of frames) [...g.title].forEach((c, k) => set(top * columns + left + 2 + k, c, c === ' ' ? DEFAULT : TONE.inactive.rgb))

  // F09-R24: the boxes over the lines: a rounded border, solid in context and dashed otherwise; the size bar along the bottom.
  const biggest = Math.max(1, ...files.map(n => n.tokens ?? 0))
  const put = (x: number, y: number, c: string, fg: number) => set(y * columns + x, c, fg)
  for (const p of placed.values()) {
    const { node, text, left, top, w, boxed } = p
    const pulsing = pulse.includes(node.path) && step < PULSE.length
    // A tag has no border: the focus and the pulse colour its name instead.
    const name = (k: number) => k >= 2 && k < 2 + [...fileName(node.path)].length
    if (!boxed) { text.forEach(([c, fg], k) => put(left + k, top, c, name(k) && (pulsing || node.path === focus) ? (pulsing ? PULSE[step]! : TONE.claude.rgb) : fg)); continue }
    const border = pulsing ? PULSE[step]! : node.path === focus ? TONE.claude.rgb : node.change ? CHANGE_TONE[node.change].rgb : solid(node.state) ? TONE.border.rgb : TONE.subtle.rgb
    const { h, v } = solid(node.state) ? SOLID : DASHED
    const bar = node.tokens === null ? 0 : Math.max(1, Math.round((w - 2) * Math.sqrt(node.tokens / biggest)))
    for (let k = 1; k < w - 1; k++) { put(left + k, top, h, border); put(left + k, top + 2, k <= bar ? '━' : h, k <= bar ? STATE_TONE[node.state].rgb : border) }
    put(left, top, '╭', border); put(left + w - 1, top, '╮', border); put(left, top + 2, '╰', border); put(left + w - 1, top + 2, '╯', border)
    put(left, top + 1, v, border); put(left + w - 1, top + 1, v, border)
    put(left + 1, top + 1, ' ', DEFAULT); put(left + w - 2, top + 1, ' ', DEFAULT)
    text.forEach(([c, fg], k) => put(left + 2 + k, top + 1, c, fg))
  }
  // Where a line meets a border, the border joins it: `┬` under a box, `┴` over one.
  for (const { p, x, y, dir } of ends) {
    if (!p.boxed) continue
    const i = y * columns + x, c = String.fromCodePoint(cells[i * 3]!)
    if (c === '━') continue // the size bar stays whole
    set(i, LINE[(LEFT | RIGHT | dir) - 1]!, cells[i * 3 + 1]!)
  }
  return cells
}
