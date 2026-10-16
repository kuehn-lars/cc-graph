// Pure: what a Bash call did that the status cannot show, from its command alone (F07-R21, R22; R7 for an edit Claude Code showed Claude).
import type { Graph } from '../../types'
import { cut } from '../parse/shell'
import { shellChanged } from './shellChanged'
import { touch } from './node'

/** `deleted`: node paths, or folders, an `rm` removed last; `edited`: node paths the command wrote. Only paths with a node change. */
export type Commanded = { type: 'commanded'; command: string; deleted: string[]; edited: string[]; agentId?: string }

export const commanded = (g: Graph, a: Commanded, turn: number): Graph => {
  const edited = a.edited.filter(p => g.files[p])
  const out = edited.length ? shellChanged(g, { type: 'shellChanged', command: a.command, changes: edited.map(path => ({ path, change: 'edited', named: true })), ...(a.agentId ? { agentId: a.agentId } : {}) }, turn) : g
  const gone = Object.keys(out.files).filter(p => a.deleted.some(d => p === d || p.startsWith(`${d}/`)) && out.files[p]!.change !== 'deleted')
  return gone.reduce((g, p) => touch(g, p, turn, () => ({ change: 'deleted', reason: `deleted by \`${cut(a.command)}\`` }), a.agentId), out)
}
