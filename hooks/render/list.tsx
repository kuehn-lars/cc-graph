// Pure: the list view. Takes the element table from `$.ui.resolve(e)` and the graph; returns a tree.
import type { Elements } from 'claude-code'
import type { FileNode, Graph, NodeState } from '../../types'
import { cols, tail } from './width'

type Table = Pick<Elements['terminal'], 'Box' | 'Text'>

// 02 Data model: the glyph of each state. No state is told by color alone (NFR-A1).
const GLYPH: Record<NodeState, string> = { read: '●', partial: '◐', search: '◌', compacted: '○', unread: '!', ghost: '⋯' }

const badge = (n: FileNode) =>
  n.change === 'edited' ? `edited +${n.added} −${n.removed}` : n.change === 'created' ? `created +${n.added}` : n.change

/** The path cut from its start and led by "…" so it takes at most `room` columns; null when not even "…" and the file name fit. */
const fitPath = (path: string, room: number) =>
  cols(path) <= room ? path : cols(path.slice(path.lastIndexOf('/') + 1)) + 1 > room ? null : `…${tail(path, room - 1)}`

/**
 * `● path  edited +3 −1  ≈414 · 49 lines` in at most `columns` columns: the badge is left out when the file has no change.
 * The path gives way first (F08-R6, its file name stays); when even that does not fit, the size and then the badge are dropped.
 */
function row(n: FileNode, columns: number) {
  const head = `${GLYPH[n.state]} `
  const parts = [badge(n), `≈${n.tokens ?? '?'} · ${n.seen}`].filter(Boolean)
  for (let k = parts.length; k >= 0; k--) {
    const suffix = parts.slice(0, k).map(p => `  ${p}`).join('')
    const path = fitPath(n.path, columns - cols(head + suffix))
    if (path !== null) return head + path + suffix
  }
  return `${head}…${tail(n.path, columns - cols(head) - 1)}` // ponytail: a file name wider than the pane loses its start too
}

export function renderList({ Box, Text }: Table, graph: Graph, columns: number) {
  const files = Object.values(graph.files).sort((a, b) => b.touched - a.touched)
  return (
    <Box flexDirection="column">
      <Text bold>Files</Text>
      {files.length === 0 && <Text dimColor>Nothing read yet.</Text>}
      {files.map(n => <Text key={n.path}>{row(n, columns)}</Text>)}
    </Box>
  )
}
