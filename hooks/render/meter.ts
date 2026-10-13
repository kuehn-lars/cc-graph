// Pure: the meter line (F03-R5), shared by the list header and the text summary.
import type { Fill, Graph } from '../../types'
import { inContext } from '../model/compacted'
import { plural } from '../parse/measure'
import { RING, TONE } from './cells'
import type { Seg } from './width'

/** F03-R5a: "850", "12.4k", "200k"; a million or more as "1M" (F09-R21). */
export const count = (n: number) => (n < 1000 ? String(n) : n < 1e6 ? `${Math.round(n / 100) / 10}k` : `${Math.round(n / 1e5) / 10}M`)

/** `≈12.4k in 7 files (+2 unknown) · window 41% of 200k`; "window –" until the fill carries a percent (F03-R6). */
export function meterLine(graph: Graph, fill: Fill | null): string {
  const nodes = Object.values(graph.files).filter(inContext)
  const known = nodes.filter(n => n.tokens !== null)
  const sum = known.reduce((s, n) => s + n.tokens!, 0)
  const unknown = nodes.length - known.length
  const window = fill && fill.percent !== null ? `window ${fill.percent}% of ${count(fill.window)}` : 'window –'
  return `≈${count(sum)} in ${plural(known.length, 'file')}${unknown ? ` (+${unknown} unknown)` : ''} · ${window}`
}

const BAR = 16
const num = (text: string): Seg => ({ text, color: TONE.text.key })
const word = (text: string): Seg => ({ text, dim: true })

/** F09-R21: `━━━━━━━━━━━━━━━━ 6% of 1M  ≈300 tokens · 3 files · 1 compacted · 1 changed unseen`, numbers bright, words dimmed, the unseen count red; "window –" and no bar without a percent. */
export function meterSegs(graph: Graph, fill: Fill | null): Seg[] {
  const files = Object.values(graph.files)
  const known = files.filter(inContext).filter(n => n.tokens !== null) // F03-R5: files of unknown size are not counted
  const tokens = known.reduce((s, n) => s + n.tokens!, 0)
  const stat = (n: number, w: string): Seg[] => (n ? [word(' · '), num(String(n)), word(` ${w}`)] : [])
  const filled = fill && fill.percent !== null ? Math.min(BAR, Math.max(1, Math.round((fill.percent * BAR) / 100))) : 0
  const unseen = files.filter(n => n.change === 'blind').length
  return [
    ...(fill && fill.percent !== null
      ? [{ text: '━'.repeat(filled), color: TONE.inContext.key }, ...(filled < BAR ? [{ text: '━'.repeat(BAR - filled), color: TONE.subtle.key }] : []), word(' '), num(`${fill.percent}%`), word(' of '), num(count(fill.window))]
      : [word('window –')]),
    word('  '), num(`≈${count(tokens)}`), word(' tokens'),
    ...stat(known.length, 'files'), ...stat(files.filter(n => n.state === 'compacted').length, 'compacted'),
    ...(unseen ? [word(' · '), { text: `${unseen} changed unseen`, color: RING.blind.key }] : []),
  ]
}
