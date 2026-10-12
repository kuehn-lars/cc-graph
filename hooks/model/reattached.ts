// Pure: a file Claude Code re-attached after a compaction is filled again (F03-R3). Any other node stays as it is.
import type { Graph } from '../../types'

export type Reattached = { type: 'reattached'; path: string; tokens: number }

export const reattached = (g: Graph, a: Reattached): Graph => {
  const old = g.files[a.path]
  return old?.state === 'compacted'
    ? { ...g, files: { ...g.files, [a.path]: { ...old, state: 'read', seen: 're-attached after compaction', tokens: a.tokens } } } : g
}
