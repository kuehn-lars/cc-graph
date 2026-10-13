// Pure: a canvas of braille dots (F09-R12). Each dot has a colour and a priority; a cell is U+2800 plus the bits of its lit dots, in the colour of its most important one.

/** The bit of the dot at `[dotRow][dotColumn]` of a cell. */
const BITS = [[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]]

/** How important a dot is where a cell holds several (F09-R12), the most important last. */
export const PRIORITY = { edge: 1, litEdge: 2, decisionEdge: 3, blindEdge: 4, halo: 5, body: 6, change: 7, selected: 8 } as const

export type Canvas = ReturnType<typeof canvas>

/** A canvas `width × height` dots (a multiple of 2 × 4 for whole cells). */
export function canvas(width: number, height: number) {
  const priority = new Uint8Array(width * height), color = new Uint32Array(width * height)
  return {
    width, height,
    /** Lights the dot unless a more important one is lit there; off the canvas is ignored. */
    set(x: number, y: number, c: number, p: number) {
      if (x < 0 || y < 0 || x >= width || y >= height) return
      const i = y * width + x
      if (p >= priority[i]!) { priority[i] = p; color[i] = c }
    },
    /** The cell at column `cx`, row `cy`: its braille character (`null` with no dot lit), its colour and its highest priority. */
    cell(cx: number, cy: number) {
      let bits = 0, top = 0, c = 0
      BITS.forEach((row, dr) => row.forEach((bit, dc) => {
        const i = (cy * 4 + dr) * width + cx * 2 + dc, p = priority[i]!
        if (!p) return
        bits |= bit
        if (p > top) { top = p; c = color[i]! }
      }))
      return { char: bits ? String.fromCodePoint(0x2800 + bits) : null, color: c, priority: top }
    },
  }
}
