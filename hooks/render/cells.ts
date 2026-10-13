// Pure: the cells of the graph, a `Raster` of boxes joined by box-drawing lines (F09-R23..R27), and their packed form.
import type { Change, FileNode, Graph, Layout, NodeState } from '../../types'
import { folderOf, seedPoint } from '../layout/seed'
import { cols, tail } from './width'

/** `[codePoint, foreground, background]` per cell, row-major, three words a cell: the Raster's own layout. */
export type Cells = Uint32Array

/** `0x01000000`: the terminal's own color. */
export const DEFAULT = 0x01000000

// 02 Data model: the glyph of each state, in the list and in the graph's boxes. No state is told by color alone (NFR-A1).
export const GLYPH: Record<NodeState, string> = { read: '●', partial: '◐', search: '◌', compacted: '○', unread: '!', ghost: '⋯' }

/**
 * F09-R30: Claude Code's own colours, by theme key. A `Text` names the key, so it follows the person's theme; a `Raster` cell takes a raw colour, so it paints the key's value in Claude Code's dark theme.
 */
const tone = (key: string, rgb: number) => ({ key, rgb })
export const TONE = {
  claude: tone('claude', 0xd77757), shimmer: tone('claudeShimmer', 0xeb9f7f), inContext: tone('suggestion', 0xb1b9f9), search: tone('planMode', 0x48968c),
  inactive: tone('inactive', 0x999999), border: tone('promptBorder', 0x888888), subtle: tone('subtle', 0x505050), text: tone('text', 0xffffff),
  edited: tone('warning', 0xffc107), created: tone('success', 0x4eba65), blind: tone('error', 0xff6b80),
}

/** The colour of each state's glyph and size bar (F09-R24). */
export const COLOR: Record<NodeState, typeof TONE.claude> = { read: TONE.inContext, partial: TONE.inContext, search: TONE.search, compacted: TONE.inactive, unread: TONE.inactive, ghost: TONE.inactive }

/** The colour of each change: its box's border and its word (F09-R24). */
export const RING: Record<Change, typeof TONE.claude> = { edited: TONE.edited, created: TONE.created, deleted: TONE.blind, external: TONE.inactive, blind: TONE.blind }

/** The cells as little-endian u32s, as standard padded base64. */
export const encode = (cells: Cells) => (new Uint8Array(cells.buffer) as Uint8Array & { toBase64(): string }).toBase64() // the engine has it, the es2023 lib does not

/** F09-R18: the now node, the node that is not a ghost with the highest `touched`. */
export const nowNode = (graph: Graph) => Object.values(graph.files).filter(n => n.state !== 'ghost').reduce<FileNode | null>((top, n) => (!top || n.touched > top.touched ? n : top), null)

/** F09-R24: what a change says, in its colours: an edit's added lines in the created colour and its removed lines in the deleted one, as a diff does; every other change in its own. */
export function changeParts(n: FileNode): [string, typeof TONE.claude][] {
  switch (n.change) {
    case 'edited': return [[`+${n.added}`, TONE.created], [' ', TONE.text], [`−${n.removed}`, TONE.blind]]
    case 'created': return [[`+${n.added} new`, TONE.created]]
    case 'deleted': return [['deleted', TONE.blind]]
    case 'external': return [['changed', TONE.inactive]]
    case 'blind': return [['changed unseen', TONE.blind]]
    default: return []
  }
}

const inContext = (s: NodeState) => s === 'read' || s === 'partial' || s === 'search'

// Box drawing by the directions a cell joins: up 1, down 2, left 4, right 8 (F09-R26).
const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8
const LINE = '│││─╯╮┤─╰╭├─┴┬┼' // by directions − 1
const SOLID = { h: '─', v: '│' }, DASHED = { h: '┄', v: '┆' }

/** F09-R27: the pulse's border colour, by step; the plain frame after it. */
const PULSE = [TONE.text.rgb, TONE.shimmer.rgb, TONE.claude.rgb]

type Placed = { node: FileNode; text: [string, number][]; left: number; top: number; w: number; h: number; boxed: boolean }
type Member = { node: FileNode; text: [string, number][]; at: { x: number; y: number }; layer: number }
/** A folder's frame and the spots of its nodes inside it, relative to its top-left corner. */
type Group = { folder: string; title: string; w: number; h: number; slots: Omit<Placed, 'node' | 'text'>[]; members: Member[] }

/** F09-R25: `v` of `values` onto `lo..hi`, the values' range padded by 8 units each side and at least `span`, centred. */
function fit(values: number[], lo: number, hi: number, span: number) {
  const min = Math.min(...values), max = Math.max(...values)
  const scale = (hi - lo) / Math.max(max - min + 16, span)
  return (v: number) => (lo + hi) / 2 + (v - (min + max) / 2) * scale
}

/** F09-R30: the layer of each of `ids` under the links `[from, to]`: 0 for one nothing links to, else one more than the deepest that links to it; a link that closes a cycle is ignored (depth first, in `ids` order). */
function layers(ids: string[], links: [string, string][]) {
  const out = new Map(ids.map(id => [id, [] as string[]]))
  for (const [a, b] of links) if (a !== b && out.has(a) && out.has(b) && !out.get(a)!.includes(b)) out.get(a)!.push(b)
  const state = new Map<string, 1 | 2>(), order: string[] = [], kept: [string, string][] = []
  const visit = (id: string) => {
    state.set(id, 1)
    for (const to of out.get(id)!) {
      if (state.get(to) === 1) continue // a back link: ignored
      kept.push([id, to])
      if (!state.has(to)) visit(to)
    }
    state.set(id, 2)
    order.push(id)
  }
  for (const id of ids) if (!state.has(id)) visit(id)
  const layer = new Map(ids.map(id => [id, 0]))
  for (const id of order.reverse()) for (const [a, b] of kept) if (a === id) layer.set(b, Math.max(layer.get(b)!, layer.get(a)! + 1))
  return layer
}


/**
 * F09-R30: a folder's nodes in lines, at most `k` to a line and a new line for each layer of the imports inside the folder, in order of layer, then position, then path; each line centred, 2 columns between boxes and a row between lines; the frame 2 columns wider each side and a row taller each end.
 * Of every `k` whose frame fits `maxW × maxH`, the one whose shape is nearest 1.5 × maxW / maxH (2 to 6); null when none fits. `boxed` false draws every node as a tag.
 */
function arrange(folder: string, members: Member[], boxed: boolean, maxW: number, maxH: number): Group | null {
  const aspect = Math.min(6, Math.max(2, (1.5 * maxW) / maxH)) * (boxed ? 1 : 2) // F09-R30: the shape the lines aim for, columns per row: wider in a wide pane, and for tags, a row each
  const full = ` ${folder ? `${folder}/` : './'} `, room = maxW - 6 // a path wider than the pane loses its start
  const title = cols(full) <= room ? full : ` …${tail(full.slice(1), room - 2)}`
  let best: Group | null = null, bestScore = Infinity
  for (let k = 1; k <= members.length; k++) {
    const lines: { w: number; h: number; slots: { m: Member; w: number; h: number; boxed: boolean }[] }[] = []
    for (const m of members) {
      const box = boxed && m.node.state !== 'ghost' // F09-R24: a ghost is never opened, so it has no box
      const slot = { m, w: m.text.length + (box ? 4 : 0), h: box ? 3 : 1, boxed: box }
      const line = lines[lines.length - 1]
      if (line && line.slots.length < k && line.slots[0]!.m.layer === m.layer) { line.slots.push(slot); line.w += 2 + slot.w; line.h = Math.max(line.h, slot.h) }
      else lines.push({ slots: [slot], w: slot.w, h: slot.h })
    }
    const inner = Math.max(cols(title) + 1, ...lines.map(l => l.w))
    // A row between lines, where the lines between them run; two lines of tags of one layer close up (nothing links them).
    const gap = (i: number) => (i && (lines[i]!.h > 1 || lines[i - 1]!.h > 1 || lines[i]!.slots[0]!.m.layer !== lines[i - 1]!.slots[0]!.m.layer) ? 1 : 0)
    const w = inner + 4, h = lines.reduce((s, l, i) => s + l.h + gap(i), 0) + 2
    if (w > maxW) break // wider with every k
    if (h > maxH) continue
    const score = Math.abs(Math.log(w / h / aspect))
    if (score >= bestScore) break // w / h only grows with k: past the best shape it gets no nearer
    bestScore = score
    const slots: Group['slots'] = [], ordered: Member[] = []
    let top = 1
    for (const [i, l] of lines.entries()) {
      top += gap(i)
      let left = 2 + (l.slots.some(b => b.boxed) ? (inner - l.w) >> 1 : 0) // boxes centred, tags flush left like the list
      for (const b of l.slots) {
        slots.push({ left, top: top + ((l.h - b.h) >> 1), w: b.w, h: b.h, boxed: b.boxed })
        ordered.push(b.m)
        left += b.w + 2
      }
      top += l.h
    }
    best = { folder, title, w, h, slots, members: ordered }
  }
  return best
}

/**
 * `columns × rows` cells on the terminal's own background (F09-R23): the file nodes grouped by folder, each folder a frame titled with its path (R30) around its nodes' boxes, at the mean of its nodes' positions in `layout` (else their folder's seed point, F09-R9) fitted to the raster, moved off the other folders, joined by box-drawing import edges (R26).
 * The focus, the selected node or else the now node, has a border in Claude's colour and lights its edges (R24, R26). A node in `pulse` has the pulse's border colour for `step` (R27).
 */
export function paint(graph: Graph, layout: Layout, columns: number, rows: number, selected: string | null = null, pulse: string[] = [], step = 0): Cells {
  const cells: Cells = new Uint32Array(columns * rows * 3)
  cells.set([32, DEFAULT, DEFAULT]) // a space on the terminal's own colours, copied over the rest in doubling runs
  for (let n = 3; n < cells.length; n *= 2) cells.copyWithin(n, 0, Math.min(n, cells.length - n))
  const set = (i: number, c: string, fg: number) => { cells[i * 3] = c.codePointAt(0)!; cells[i * 3 + 1] = fg }
  const files = Object.values(graph.files)
  const now = nowNode(graph)
  const focus = selected !== null && graph.files[selected] ? selected : now?.path ?? null // a selection that left the graph falls back to the now node
  if (!files.length) return cells

  // F09-R24: what a box holds: the glyph, the file name (a character a Raster refuses as `?`; a deleted file's dimmed), the change word.
  const content = (n: FileNode): [string, number][] => [
    [GLYPH[n.state], COLOR[n.state].rgb], [' ', DEFAULT],
    ...[...n.path.slice(n.path.lastIndexOf('/') + 1)].map(c => [cols(c) === 1 && c.codePointAt(0)! <= 0xffff ? c : '?', inContext(n.state) && n.change !== 'deleted' ? DEFAULT : TONE.inactive.rgb] as [string, number]),
    ...(n.change ? [['  ', DEFAULT] as const, ...changeParts(n)].flatMap(([t, tone]) => [...t].map(c => [c, typeof tone === 'number' ? tone : tone.rgb] as [string, number])) : []),
  ]

  // F09-R30: one group a folder; its nodes in layers of the imports inside it, then by position.
  const links = graph.edges.filter(e => e.kind === 'import' && graph.files[e.from] && graph.files[e.to]).map(e => [e.from, e.to] as [string, string])
  const byFolder = new Map<string, Member[]>()
  for (const n of files) byFolder.set(folderOf(n.path), [...(byFolder.get(folderOf(n.path)) ?? []), { node: n, text: content(n), at: layout[n.path] ?? seedPoint(folderOf(n.path)), layer: 0 }])
  const folders = [...byFolder.keys()].sort()
  for (const ms of byFolder.values()) {
    const inner = layers(ms.map(m => m.node.path).sort(), links)
    for (const m of ms) m.layer = inner.get(m.node.path)!
    ms.sort((a, b) => a.layer - b.layer || a.at.x - b.at.x || (a.node.path < b.node.path ? -1 : 1))
  }
  // The folders in layers too: one that imports from another sits above it; a folder with no import either way sits in a row of its own at the bottom.
  const folderLinks = links.map(([a, b]) => [folderOf(a), folderOf(b)] as [string, string]).filter(([a, b]) => a !== b)
  const linked = new Set(folderLinks.flat())
  const depth = layers(folders, folderLinks)
  const loose = linked.size ? Math.max(...[...depth.values()]) + 1 : -1 // with no import between folders, every folder is in one layer
  const level = (f: string) => (linked.has(f) ? depth.get(f)! : linked.size ? loose : 0)
  const all = files.map(n => layout[n.path] ?? seedPoint(folderOf(n.path)))
  const mapX = fit(all.map(p => p.x), 0, columns, 40)
  const meanX = (f: string) => byFolder.get(f)!.reduce((s, m) => s + mapX(m.at.x), 0) / byFolder.get(f)!.length

  // Each folder boxed while the whole fits; else the tallest boxed folder becomes tags, one at a time; else the last folders are left out (the list still has them, NFR-A3).
  const shape = new Map(folders.map(f => [f, arrange(f, byFolder.get(f)!, true, columns, rows) ?? arrange(f, byFolder.get(f)!, false, columns, rows)]))
  let shown = folders.filter(f => shape.get(f))
  const GAP_X = 3, GAP_Y = 1 // between folders in a row, and between rows: where the lines run
  type Framed = { g: Group; left: number; top: number }
  /** Where each shown folder's frame goes with `extra` more rows between rows, from the top; null when it does not fit. */
  const build = (extra: number): Framed[] | null => {
    const out: Framed[] = []
    const centre = new Map<string, number>()
    let y = 0
    for (const lv of [...new Set(shown.filter(f => level(f) !== loose).map(level))].sort((a, b) => a - b)) {
      // A folder under the folders that import it: at the mean of their centres, else at its nodes' mean position.
      const bary = (f: string) => {
        const above = folderLinks.filter(([a, b]) => b === f && centre.has(a)).map(([a]) => centre.get(a)!)
        return above.length ? above.reduce((s, x) => s + x, 0) / above.length : meanX(f)
      }
      const here = shown.filter(f => level(f) === lv).map(f => ({ f, g: shape.get(f)!, x: bary(f) })).sort((a, b) => a.x - b.x || (a.f < b.f ? -1 : 1))
      // Wrapped into rows as wide as the raster; in a row each folder as near its spot as its neighbours let it.
      for (let i = 0; i < here.length; ) {
        let j = i, w = here[i]!.g.w
        while (j + 1 < here.length && w + GAP_X + here[j + 1]!.g.w <= columns) w += GAP_X + here[++j]!.g.w
        const row = here.slice(i, j + 1).map(({ f, g, x }) => ({ f, g, left: Math.round(x - g.w / 2) }))
        for (let k = 0; k < row.length; k++) row[k]!.left = Math.max(row[k]!.left, k ? row[k - 1]!.left + row[k - 1]!.g.w + GAP_X : 0)
        for (let k = row.length - 1; k >= 0; k--) row[k]!.left = Math.min(row[k]!.left, k < row.length - 1 ? row[k + 1]!.left - GAP_X - row[k]!.g.w : columns - row[k]!.g.w)
        for (const r of row) { centre.set(r.f, r.left + r.g.w / 2); out.push({ g: r.g, left: r.left, top: y }) }
        y += Math.max(...row.map(r => r.g.h)) + GAP_Y + extra
        i = j + 1
      }
    }
    if (y - GAP_Y - extra > rows) return null
    // The layers centred across the room the folders without imports leave at the right, when they fit beside them; else across the raster.
    if (out.length) {
      const lo = Math.min(...out.map(f => f.left)), hi = Math.max(...out.map(f => f.left + f.g.w))
      const side = Math.max(0, ...shown.filter(f => level(f) === loose).map(f => shape.get(f)!.w + GAP_X))
      const width = hi - lo + side <= columns ? columns - side : columns
      const shift = Math.max(0, (width - (hi - lo)) >> 1) - lo
      for (const f of out) f.left += shift
    }
    // A folder with no import either way in the first free spot, top down and then right to left, 2 columns and 1 row clear of every frame.
    const free = shown.filter(f => level(f) === loose).sort((a, b) => meanX(b) - meanX(a) || (a < b ? -1 : 1))
    if (!free.length) return out
    const room = new Uint8Array(columns * rows), sums = new Int32Array((columns + 1) * (rows + 1))
    const mark = (f: Framed) => {
      for (let r = Math.max(0, f.top - 1); r < Math.min(rows, f.top + f.g.h + 1); r++) room.fill(1, r * columns + Math.max(0, f.left - 2), r * columns + Math.min(columns, f.left + f.g.w + 2))
    }
    const tally = () => {
      for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++)
        sums[(r + 1) * (columns + 1) + c + 1] = room[r * columns + c]! + sums[r * (columns + 1) + c + 1]! + sums[(r + 1) * (columns + 1) + c]! - sums[r * (columns + 1) + c]!
    }
    const busy = (c: number, r: number, w: number, h: number) => sums[(r + h) * (columns + 1) + c + w]! - sums[r * (columns + 1) + c + w]! - sums[(r + h) * (columns + 1) + c]! + sums[r * (columns + 1) + c]!
    out.forEach(mark)
    tally()
    for (const f of free) {
      const g = shape.get(f)!
      let spot: Framed | null = null
      for (let top = 0; !spot && top + g.h <= rows; top++) for (let left = columns - g.w; !spot && left >= 0; left--) if (!busy(left, top, g.w, g.h)) spot = { g, left, top }
      if (!spot) return null
      out.push(spot)
      mark(spot)
      tally()
    }
    return out
  }
  // Each folder boxed, with as much room between rows as fits (at most 3 more rows); else the tallest boxed folder becomes tags, one at a time; else a folder is left out, one at a time: one without a change before one with, the one touched longest ago first, never the focus's (the list still has them, NFR-A3).
  let framed: Framed[] | null = null
  while (!framed && shown.length) {
    framed = build(0)
    if (framed) {
      for (let extra = 3; extra > 0; extra--) { const airy = build(extra); if (airy) { framed = airy; break } }
      break
    }
    const boxed = shown.filter(f => shape.get(f)!.slots.some(s => s.boxed)).sort((a, b) => shape.get(b)!.h - shape.get(a)!.h || (a < b ? -1 : 1))[0]
    const tags = boxed === undefined ? null : arrange(boxed, byFolder.get(boxed)!, false, columns, rows) // the root folder is ''
    if (boxed !== undefined && tags && tags.h < shape.get(boxed)!.h) shape.set(boxed, tags)
    else { // a folder without a change before one with, as eviction keeps changed files (I5); of those the one Claude touched longest ago; never the focus's
      const keep = (f: string) => {
        const ms = byFolder.get(f)!
        return ms.some(m => m.node.path === focus) ? Infinity : (ms.some(m => m.node.change) ? 1e9 : 0) + Math.max(...ms.map(m => m.node.touched))
      }
      const stale = shown.reduce((a, b) => (keep(b) < keep(a) ? b : a))
      shown = shown.filter(f => f !== stale)
    }
  }
  // Centred down the raster.
  const shift = framed?.length ? (rows - Math.max(...framed.map(f => f.top + f.g.h))) >> 1 : 0
  const placed = new Map<string, Placed>()
  const frameOf = new Map<string, { top: number; bottom: number }>()
  const frames = (framed ?? []).map(f => ({ ...f, top: f.top + shift }))
  for (const { g, left, top } of frames)
    g.slots.forEach((s, k) => {
      placed.set(g.members[k]!.node.path, { ...s, node: g.members[k]!.node, text: g.members[k]!.text, left: left + s.left, top: top + s.top })
      frameOf.set(g.members[k]!.node.path, { top, bottom: top + g.h - 1 })
    })
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
  const joins = new Uint8Array(columns * rows), lit = new Uint8Array(columns * rows)
  const ends: { p: Placed; x: number; y: number; dir: number }[] = []
  const joined: number[] = [] // every line cell, to draw
  const join = (x: number, y: number, dir: number, on: boolean) => {
    if (x < 0 || y < 0 || x >= columns || y >= rows) return
    const i = y * columns + x
    if (!joins[i]) joined.push(i)
    joins[i]! |= dir
    if (on) lit[i] = 1
  }
  const run = (path: [number, number][], on: boolean) => {
    for (let k = 1; k < path.length; k++) {
      let [x, y] = path[k - 1]!
      const [tx, ty] = path[k]!
      while (x !== tx || y !== ty) {
        const dx = Math.sign(tx - x), dy = Math.sign(ty - y)
        join(x, y, dx > 0 ? RIGHT : dx < 0 ? LEFT : dy > 0 ? DOWN : UP, on)
        x += dx; y += dy
        join(x, y, dx > 0 ? LEFT : dx < 0 ? RIGHT : dy > 0 ? UP : DOWN, on)
      }
    }
  }
  // What a run costs: the box and side cells it crosses, counted along each row and each column, so a run costs two lookups.
  const alongRow = new Int32Array((columns + 1) * rows), alongColumn = new Int32Array(columns * (rows + 1))
  for (let y = 0, i = 0; y < rows; y++) for (let x = 0, sum = 0, r = y * (columns + 1) + 1; x < columns; x++, i++) alongRow[r + x] = sum += taken[i]!
  for (let x = 0; x < columns; x++) for (let y = 0, sum = 0, c = x * (rows + 1) + 1; y < rows; y++) alongColumn[c + y] = sum += taken[y * columns + x]!
  const inside = (v: number, size: number) => Math.min(Math.max(v, 0), size - 1)
  const across = (y: number, a: number, b: number) => { // row y from column a to b, both ends counted
    const r = inside(y, rows) * (columns + 1)
    return alongRow[r + inside(Math.max(a, b), columns) + 1]! - alongRow[r + inside(Math.min(a, b), columns)]!
  }
  const down = (x: number, a: number, b: number) => { // column x from row a to b
    const c = inside(x, columns) * (rows + 1)
    return alongColumn[c + inside(Math.max(a, b), rows) + 1]! - alongColumn[c + inside(Math.min(a, b), rows)]!
  }
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
      // down(x0, y0, m) + across(m, x0, x) + down(x, m, y1), inlined: every run is inside the raster, and this loop is most of a frame's time.
      const c0 = x0 * (rows + 1), c1 = x * (rows + 1), lo = Math.min(x0, x), hi = Math.max(x0, x) + 1
      for (let m = y0; m <= y1; m++) {
        const r = m * (columns + 1)
        const n = alongColumn[c0 + m + 1]! - alongColumn[c0 + y0]! + alongRow[r + hi]! - alongRow[r + lo]! + alongColumn[c1 + y1 + 1]! - alongColumn[c1 + m]!
        if (n < fewest || (n === fewest && Math.abs(x - centre) < Math.abs(x1 - centre))) { x1 = x; mid = m; fewest = n }
      }
    }
    let path: [number, number][] = [[x0, y0], [x0, mid], [x1, mid], [x1, y1]]
    // F09-R26: a line that crosses more than it must goes round instead: out under its own folder, along the clearest column (the nearest of those), and in over the other's.
    const out = frameOf.get(upper.node.path)!.bottom + 1, into = frameOf.get(lower.node.path)!.top - 1
    if (out < into && fewest > down(x0, y0, out) + down(x1, into, y1) + 2) {
      let c = x0, round = Infinity
      const ends = down(x0, y0, out) + down(x1, into, y1), ro = out * (columns + 1), ri = into * (columns + 1)
      for (let x = 0; x < columns; x++) { // across(out, x0, x) + down(x, out, into) + across(into, x, x1), inlined
        const cx = x * (rows + 1)
        const n = ends + alongRow[ro + Math.max(x0, x) + 1]! - alongRow[ro + Math.min(x0, x)]! + alongColumn[cx + into + 1]! - alongColumn[cx + out]! + alongRow[ri + Math.max(x, x1) + 1]! - alongRow[ri + Math.min(x, x1)]!
        if (n < round || (n === round && Math.abs(x - x0) < Math.abs(c - x0))) { c = x; round = n }
      }
      if (round < fewest) path = [[x0, y0], [x0, out], [c, out], [c, into], [x1, into], [x1, y1]]
    }
    join(x0, y0, UP, on); join(x1, y1, DOWN, on)
    run(path, on)
    ends.push({ p: upper, x: x0, y: y0 - 1, dir: DOWN }, { p: lower, x: x1, y: y1 + 1, dir: UP })
  }
  // F09-R30: the frames under the lines; where a line crosses a side, the side joins it (`┼`), in the line's colour. A box covers any line beneath it.
  for (const i of sides) set(i, LINE[frame[i]! - 1]!, TONE.subtle.rgb)
  for (const i of joined) if (!boxes[i]) set(i, LINE[(joins[i]! | frame[i]!) - 1]!, lit[i] ? TONE.claude.rgb : TONE.subtle.rgb)
  // The title over all of it, after `╭─`.
  for (const { g, left, top } of frames) [...g.title].forEach((c, k) => set(top * columns + left + 2 + k, c, c === ' ' ? DEFAULT : TONE.inactive.rgb))

  // F09-R24: the boxes over the lines: a rounded border, solid in context and dashed otherwise; the size bar along the bottom.
  const biggest = Math.max(1, ...files.map(n => n.tokens ?? 0))
  const put = (x: number, y: number, c: string, fg: number) => set(y * columns + x, c, fg)
  for (const p of placed.values()) {
    const { node, text, left, top, w, boxed } = p
    const pulsing = pulse.includes(node.path) && step < PULSE.length
    // A tag has no border: the focus and the pulse colour its name instead.
    const name = (k: number) => k >= 2 && k < 2 + [...node.path.slice(node.path.lastIndexOf('/') + 1)].length
    if (!boxed) { text.forEach(([c, fg], k) => put(left + k, top, c, name(k) && (pulsing || node.path === focus) ? (pulsing ? PULSE[step]! : TONE.claude.rgb) : fg)); continue }
    const border = pulsing ? PULSE[step]! : node.path === focus ? TONE.claude.rgb : node.change ? RING[node.change].rgb : inContext(node.state) ? TONE.border.rgb : TONE.subtle.rgb
    const { h, v } = inContext(node.state) ? SOLID : DASHED
    const bar = node.tokens === null ? 0 : Math.max(1, Math.round((w - 2) * Math.sqrt(node.tokens / biggest)))
    for (let k = 1; k < w - 1; k++) { put(left + k, top, h, border); put(left + k, top + 2, k <= bar ? '━' : h, k <= bar ? COLOR[node.state].rgb : border) }
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
