// Pure: the list view. Takes the element table from `$.ui.resolve(e)` and the graph; returns a tree.
import type { Elements } from 'claude-code'
import type { FileNode, Graph, NodeState } from '../../types'

type Table = Pick<Elements['terminal'], 'Box' | 'Text'>

// 02 Data model: the glyph of each state. No state is told by color alone (NFR-A1).
const GLYPH: Record<NodeState, string> = { read: '●', partial: '◐', search: '◌', compacted: '○', unread: '!', ghost: '⋯' }

const badge = (n: FileNode) =>
  n.change === 'edited' ? `edited +${n.added} −${n.removed}` : n.change === 'created' ? `created +${n.added}` : n.change

/** `● path  edited +3 −1  ≈414 · 49 lines`: the badge is left out when the file has no change. */
const row = (n: FileNode) =>
  [`${GLYPH[n.state]} ${n.path}`, badge(n), `≈${n.tokens ?? '?'} · ${n.seen}`].filter(Boolean).join('  ')

export function renderList({ Box, Text }: Table, graph: Graph) {
  const files = Object.values(graph.files).sort((a, b) => b.touched - a.touched)
  return (
    <Box flexDirection="column">
      <Text bold>Files</Text>
      {files.length === 0 && <Text dimColor>Nothing read yet.</Text>}
      {files.map(n => <Text key={n.path}>{row(n)}</Text>)}
    </Box>
  )
}
