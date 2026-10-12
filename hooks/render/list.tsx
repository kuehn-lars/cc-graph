// Pure: the list view. Takes the element table from `$.ui.resolve(e)` and the graph; returns a tree.
import type { Elements } from 'claude-code'
import type { Graph } from '../../types'

type Table = Pick<Elements['terminal'], 'Box' | 'Text'>

export function renderList({ Box, Text }: Table, graph: Graph) {
  const empty = Object.keys(graph.files).length === 0
  return (
    <Box flexDirection="column">
      <Text bold>Files</Text>
      {empty && <Text dimColor>Nothing read yet.</Text>}
    </Box>
  )
}
