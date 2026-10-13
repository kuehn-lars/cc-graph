// Pure: how many terminal columns a string takes.
// ponytail: wide = CJK, Hangul, fullwidth forms and emoji blocks; zero = combining marks and joiners. No full East Asian Width table; add one if a path shows a gap.
const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦\u{1f300}-\u{1f64f}\u{1f900}-\u{1f9ff}\u{20000}-\u{3fffd}]/u
const ZERO = /[̀-ͯ​-‏︀-️]/

export const cols = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s.length : [...s].reduce((w, c) => w + (ZERO.test(c) ? 0 : WIDE.test(c) ? 2 : 1), 0)) // printable ASCII: one column each

/** The longest end of `s` that takes at most `max` columns. */
export function tail(s: string, max: number) {
  const chars = [...s]
  let i = chars.length
  for (let w = 0; i > 0 && (w += cols(chars[i - 1]!)) <= max; i--);
  return chars.slice(i).join('')
}

/** A run of a line in one colour (a theme key, `undefined` for the text colour) or dimmed. */
export type Seg = { text: string; color?: string; dim?: boolean }

/** F09-R21: the segments of a line cut from its end to `columns` and closed by a dimmed "…"; a memory path may hold wide characters, so each counts its columns. */
export function cutSegs(segs: Seg[], columns: number): Seg[] {
  if (segs.reduce((w, s) => w + cols(s.text), 0) <= columns) return segs
  const out: Seg[] = []
  let room = columns - 1
  for (const s of segs) {
    let text = ''
    for (const c of s.text) if ((room -= cols(c)) >= 0) text += c; else break
    if (text) out.push({ ...s, text })
    if (room <= 0) break
  }
  return [...out, { text: '…', dim: true }]
}
