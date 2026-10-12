// Pure: the meter line (F03-R5), shared by the list header and the text summary.
import type { Fill, Graph } from '../../types'
import { inContext } from '../model/compacted'
import { plural } from '../parse/measure'

/** F03-R5a: "850", "12.4k", "200k". */
const count = (n: number) => (n < 1000 ? String(n) : `${Math.round(n / 100) / 10}k`)

/** `≈12.4k in 7 files (+2 unknown) · window 41% of 200k`; "window –" until the fill carries a percent (F03-R6). */
export function meterLine(graph: Graph, fill: Fill | null): string {
  const nodes = Object.values(graph.files).filter(inContext)
  const known = nodes.filter(n => n.tokens !== null)
  const sum = known.reduce((s, n) => s + n.tokens!, 0)
  const unknown = nodes.length - known.length
  const window = fill && fill.percent !== null ? `window ${fill.percent}% of ${count(fill.window)}` : 'window –'
  return `≈${count(sum)} in ${plural(known.length, 'file')}${unknown ? ` (+${unknown} unknown)` : ''} · ${window}`
}
