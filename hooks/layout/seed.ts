// Pure: where a folder's nodes start on the 100 × 64 canvas (F09-R13), and the parts of a path.
import type { Point } from '../../types'

export const CANVAS = { width: 100, height: 64 }

/** The path up to its last `/`; a file at the root has the empty folder. */
export const folderOf = (path: string) => path.slice(0, Math.max(path.lastIndexOf('/'), 0))

/** The path after its last `/`. */
export const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1)

// FNV-1a over code points.
const hash = (s: string) => {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.codePointAt(0)!, 16777619)
  return h >>> 0
}

/** A point of the canvas, kept off its edges. */
export function seedPoint(folder: string): Point {
  const h = hash(folder)
  return { x: 5 + (h % 9000) / 100, y: 4 + ((h >>> 12) % 5600) / 100 }
}

/** F09-R13: where a new node starts: its folder's seed point, offset by a hash of its path (up to 3 units each way) so no two new nodes share a point. */
export function startPoint(path: string): Point {
  const s = seedPoint(folderOf(path))
  const h = hash(path)
  return { x: s.x + ((h % 600) - 300) / 100, y: s.y + (((h >>> 10) % 600) - 300) / 100 }
}
