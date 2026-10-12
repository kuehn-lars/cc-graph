// Pure: a compaction that stands hollows what it did not keep (F03-R1).
import type { CompactMark, FileNode, Graph } from '../../types'

export type Compacted = { type: 'compacted'; keptIds: string[]; trigger: CompactMark['trigger']; tokensBefore: number | null; tokensAfter: number | null }

const inContext = (n: FileNode) => n.mainLoop && (n.state === 'read' || n.state === 'partial' || n.state === 'search')

export const compacted = (g: Graph, a: Compacted, turn: number): Graph => {
  // Only in-context nodes change; `touched` and `seq` stay, since no file was touched.
  const files = Object.fromEntries(Object.entries(g.files).map(([p, n]) =>
    [p, inContext(n) && !a.keptIds.includes(n.readId ?? '') ? { ...n, state: 'compacted' as const } : n]))
  const kept = Object.values(files).filter(inContext).length
  return { ...g, files, compactions: [...g.compactions, { turn, trigger: a.trigger, tokensBefore: a.tokensBefore, tokensAfter: a.tokensAfter, kept }] }
}
