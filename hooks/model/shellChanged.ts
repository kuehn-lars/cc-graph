// Pure: what a shell command did to files, from git's status around it (F07-R6).
import type { Graph } from '../../types'
import type { ShellChange } from '../parse/status'
import { cut } from '../parse/shell'
import { touch } from './node'

export type ShellChanged = { type: 'shellChanged'; command: string; changes: ShellChange[] }

/**
 * F07-R6: each changed path touched once. A deletion always shows; a creation replaces no change but a deletion; any other change (`blind` or `edited`, F07-R17) leaves alone what Claude's own Write or Edit did.
 * A new node, or a ghost, becomes `unread`: Claude has not seen what the command wrote.
 */
export const shellChanged = (g: Graph, a: ShellChanged, turn: number): Graph =>
  a.changes.reduce((g, { path, change }) => {
    const old = g.files[path]?.change ?? null
    const keep = change === 'created' ? old !== null && old !== 'deleted' : change !== 'deleted' && (old === 'edited' || old === 'created')
    if (keep) return g
    return touch(g, path, turn, o => ({
      ...(!o || o.state === 'ghost' ? { state: 'unread' as const, tokens: null, seen: 'never read' } : {}),
      change,
      reason: `${change === 'blind' || change === 'edited' ? 'changed' : change} by \`${cut(a.command)}\``,
    }))
  }, g)
