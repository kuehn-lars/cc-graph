// Pure: where the graph's boxes go on the raster: one frame a folder, in layers of the imports, fitted to the raster (F09-R24, R30).
import type { FileNode, Graph, Layout } from '../../types'
import { fileName, folderOf, seedPoint } from '../layout/seed'
import { CHANGE_TONE, GLYPH, STATE_TONE, TONE, changeParts, solid } from './palette'
import { cols, tail } from './width'

/** `0x01000000`: the terminal's own color. */
export const DEFAULT = 0x01000000

/** A node on the raster: its content row's characters and colours, its box (or tag) and the rows of its folder's frame. */
export type Placed = { node: FileNode; text: [string, number][]; left: number; top: number; w: number; h: number; boxed: boolean; frame: { top: number; bottom: number } }
type Member = { node: FileNode; text: [string, number][]; at: { x: number; y: number }; layer: number }
type Slot = Omit<Placed, 'node' | 'text' | 'frame'>
/** A folder's frame and the spots of its nodes inside it, relative to its top-left corner. */
type Group = { folder: string; title: string; w: number; h: number; slots: Slot[]; members: Member[] }
/** A folder's frame where it goes on the raster. */
export type Frame = { g: Group; left: number; top: number }

/** F09-R24: what a box holds: the glyph, the file name (a character a Raster refuses as `?`; a deleted file's dimmed), the change word. */
function content(n: FileNode): [string, number][] {
  const name = solid(n.state) && n.change !== 'deleted' ? DEFAULT : TONE.inactive.rgb
  return [
    [GLYPH[n.state], STATE_TONE[n.state].rgb], [' ', DEFAULT],
    ...[...fileName(n.path)].map(c => [cols(c) === 1 && c.codePointAt(0)! <= 0xffff ? c : '?', name] as [string, number]),
    ...(n.change ? [['  ', TONE.text] as const, ...changeParts(n)] : []).flatMap(([t, tone]) => [...t].map(c => [c, tone.rgb] as [string, number])),
  ]
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
    const slots: Slot[] = [], ordered: Member[] = []
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

/** F09-R30: `v` of `values` onto `lo..hi`, the values' range padded by 8 units each side and at least `span`, centred. */
function fit(values: number[], lo: number, hi: number, span: number) {
  const min = Math.min(...values), max = Math.max(...values)
  const scale = (hi - lo) / Math.max(max - min + 16, span)
  return (v: number) => (lo + hi) / 2 + (v - (min + max) / 2) * scale
}

const GAP_X = 3, GAP_Y = 1 // between folders in a row, and between rows: where the lines run

/**
 * F09-R30: the file nodes grouped by folder, each folder a frame titled with its path around its nodes' boxes, at the mean of its nodes' positions in `layout` (else their folder's seed point, F09-R9) fitted to the raster, moved off the other folders, centred down the raster.
 * What does not fit becomes tags, then is left out, never the `focus`'s folder (the list still has them, NFR-A3).
 */
export function place(graph: Graph, layout: Layout, columns: number, rows: number, focus: string | null): { placed: Map<string, Placed>; frames: Frame[] } {
  const files = Object.values(graph.files)
  // One group a folder; its nodes in layers of the imports inside it, then by position.
  const links = graph.edges.filter(e => e.kind === 'import' && graph.files[e.from] && graph.files[e.to]).map(e => [e.from, e.to] as [string, string])
  const byFolder = new Map<string, Member[]>()
  for (const n of files) {
    const f = folderOf(n.path)
    byFolder.set(f, [...(byFolder.get(f) ?? []), { node: n, text: content(n), at: layout[n.path] ?? seedPoint(f), layer: 0 }])
  }
  const folders = [...byFolder.keys()].sort()
  for (const ms of byFolder.values()) {
    const inner = layers(ms.map(m => m.node.path).sort(), links)
    for (const m of ms) m.layer = inner.get(m.node.path)!
    ms.sort((a, b) => a.layer - b.layer || a.at.x - b.at.x || (a.node.path < b.node.path ? -1 : 1))
  }
  // The folders in layers too: one that imports from another sits above it; a folder with no import either way sits apart, in free space.
  const folderLinks = links.map(([a, b]) => [folderOf(a), folderOf(b)] as [string, string]).filter(([a, b]) => a !== b)
  const linked = new Set(folderLinks.flat())
  const depth = layers(folders, folderLinks)
  const loose = linked.size ? Math.max(...depth.values()) + 1 : -1 // with no import between folders, every folder is in one layer
  const level = (f: string) => (linked.has(f) ? depth.get(f)! : linked.size ? loose : 0)
  const mapX = fit([...byFolder.values()].flat().map(m => m.at.x), 0, columns, 40)
  const meanX = (f: string) => byFolder.get(f)!.reduce((s, m) => s + mapX(m.at.x), 0) / byFolder.get(f)!.length

  const shape = new Map(folders.map(f => [f, arrange(f, byFolder.get(f)!, true, columns, rows) ?? arrange(f, byFolder.get(f)!, false, columns, rows)]))
  let shown = folders.filter(f => shape.get(f))
  /** Where each shown folder's frame goes with `extra` more rows between rows, from the top; null when it does not fit. */
  const build = (extra: number): Frame[] | null => {
    const out: Frame[] = []
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
    const mark = (f: Frame) => {
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
      let spot: Frame | null = null
      for (let top = 0; !spot && top + g.h <= rows; top++) for (let left = columns - g.w; !spot && left >= 0; left--) if (!busy(left, top, g.w, g.h)) spot = { g, left, top }
      if (!spot) return null
      out.push(spot)
      mark(spot)
      tally()
    }
    return out
  }
  // A folder without a change before one with, as eviction keeps changed files (I5); of those the one Claude touched longest ago; never the focus's.
  const keep = (f: string) => {
    const ms = byFolder.get(f)!
    return ms.some(m => m.node.path === focus) ? Infinity : (ms.some(m => m.node.change) ? 1e9 : 0) + Math.max(...ms.map(m => m.node.touched))
  }
  // Each folder boxed while the whole fits; else the tallest boxed folder becomes tags, one at a time; else a folder is left out, one at a time (keep).
  let framed: Frame[] | null = null
  while (shown.length && !(framed = build(0))) {
    const boxed = shown.filter(f => shape.get(f)!.slots.some(s => s.boxed)).sort((a, b) => shape.get(b)!.h - shape.get(a)!.h || (a < b ? -1 : 1))[0]
    const tags = boxed === undefined ? null : arrange(boxed, byFolder.get(boxed)!, false, columns, rows) // the root folder is ''
    if (boxed !== undefined && tags && tags.h < shape.get(boxed)!.h) shape.set(boxed, tags)
    else {
      const stale = shown.reduce((a, b) => (keep(b) < keep(a) ? b : a))
      shown = shown.filter(f => f !== stale)
    }
  }
  // With as much room between rows as fits, at most 3 more rows; centred down the raster.
  for (let extra = 3; framed && extra > 0; extra--) { const airy = build(extra); if (airy) { framed = airy; break } }
  const shift = framed?.length ? (rows - Math.max(...framed.map(f => f.top + f.g.h))) >> 1 : 0
  const frames = (framed ?? []).map(f => ({ ...f, top: f.top + shift }))
  const placed = new Map<string, Placed>()
  for (const { g, left, top } of frames)
    g.slots.forEach((s, k) => {
      const { node, text } = g.members[k]!
      placed.set(node.path, { ...s, node, text, left: left + s.left, top: top + s.top, frame: { top, bottom: top + g.h - 1 } })
    })
  return { placed, frames }
}
