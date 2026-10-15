// Pure: a file changed outside Claude that Claude Code showed Claude (F07-R7).
import type { Graph } from '../../types'
import { touch } from './node'

/** `path`: what the attachment names; null when its text names none in a known form, and the longest known node the text names is taken. */
export type External = { type: 'external'; path: string | null; text: string }

const REASON = 'changed outside Claude; Claude was shown it'
const names = (text: string, path: string) => new RegExp(`(^|[\\s/'"\`])${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[\\s:,'"\`]|$)`, 'm').test(text)

/** A node with no change becomes `external`; one with a change keeps it. Either way the reason says Claude was shown it. A path with no node changes nothing. */
export function external(g: Graph, a: External, turn: number): Graph {
  const path = a.path ?? Object.keys(g.files).filter(p => names(a.text, p)).sort((x, y) => y.length - x.length)[0]
  if (!path || !g.files[path]) return g
  return touch(g, path, turn, o => ({ change: o?.change ?? 'external', reason: REASON }))
}
