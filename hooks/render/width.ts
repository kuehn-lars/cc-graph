// Pure: how many terminal columns a string takes.
// ponytail: wide = CJK, Hangul, fullwidth forms and emoji blocks; zero = combining marks and joiners. No full East Asian Width table; add one if a path shows a gap.
const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦\u{1f300}-\u{1f64f}\u{1f900}-\u{1f9ff}\u{20000}-\u{3fffd}]/u
const ZERO = /[̀-ͯ​-‏︀-️]/

export const cols = (s: string) => [...s].reduce((w, c) => w + (ZERO.test(c) ? 0 : WIDE.test(c) ? 2 : 1), 0)

/** The longest end of `s` that takes at most `max` columns. */
export function tail(s: string, max: number) {
  const chars = [...s]
  let i = chars.length
  for (let w = 0; i > 0 && (w += cols(chars[i - 1]!)) <= max; i--);
  return chars.slice(i).join('')
}
