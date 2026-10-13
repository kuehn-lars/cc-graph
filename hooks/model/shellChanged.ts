// Pure: what a shell command did to files, from git's status around it (F07-R6).
import type { Change, Graph } from '../../types'
import type { ShellChange } from '../parse/status'
import { touch } from './node'

export type ShellChanged = { type: 'shellChanged'; command: string; changes: ShellChange[] }

/** The command as a reason names it: its first line, cut to 60 characters. */
const cut = (command: string) => {
  const line = command.split('\n')[0]!
  return line.length > 60 ? `${line.slice(0, 59)}…` : line
}

/**
 * F07-R6: each changed path touched once. A deletion always shows; a creation replaces no change but a deletion; any other change (`blind`) leaves alone what Claude's own Write or Edit did.
 * A new node, or a ghost, becomes `unread`: Claude has not seen what the command wrote.
 */
export const shellChanged = (g: Graph, a: ShellChanged, turn: number): Graph =>
  a.changes.reduce((g, { path, change }) => {
    const old = g.files[path]?.change ?? null
    const keep = change === 'created' ? old !== null && old !== 'deleted' : change === 'blind' && (old === 'edited' || old === 'created')
    if (keep) return g
    return touch(g, path, turn, o => ({
      ...(!o || o.state === 'ghost' ? { state: 'unread' as const, tokens: null, seen: 'never read' } : {}),
      change: change as Change,
      reason: `${change === 'deleted' ? 'deleted' : change === 'created' ? 'created' : 'changed'} by \`${cut(a.command)}\``,
    }))
  }, g)
