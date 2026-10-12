// Pure: how many terminal columns a string takes.
// ponytail: wide = CJK, Hangul, fullwidth forms and emoji blocks; zero = combining marks and joiners. No full East Asian Width table; add one if a path shows a gap.
const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦\u{1f300}-\u{1f64f}\u{1f900}-\u{1f9ff}\u{20000}-\u{3fffd}]/u
const ZERO = /[̀-ͯ​-‏︀-️]/

export const cols = (s: string) => [...s].reduce((w, c) => w + (ZERO.test(c) ? 0 : WIDE.test(c) ? 2 : 1), 0)

/** The longest end of `s` that takes at most `max` columns. */
export function tail(s: string, max: number) {
  const chars = [...s]
  let out = ''
  for (let i = chars.length - 1; i >= 0; i--) {
    const next = chars[i] + out
    if (cols(next) > max) break
    out = next
  }
  return out
}
