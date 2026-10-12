// Pure: the list view. Takes the element table from `$.ui.resolve(e)` and the graph; returns a tree.
import type { Elements } from 'claude-code'
import type { FileNode, Fill, Graph, NodeState } from '../../types'
import { meterLine } from './meter'
import { cols, tail } from './width'

type Table = Pick<Elements['terminal'], 'Box' | 'Text' | 'Button'>

// 02 Data model: the glyph of each state. No state is told by color alone (NFR-A1).
export const GLYPH: Record<NodeState, string> = { read: '●', partial: '◐', search: '◌', compacted: '○', unread: '!', ghost: '⋯' }

// F08-R8: the first nine rows carry a hotkey 1 to 9, and a plain Button draws "N: " (3 columns) before its text.
const HOTKEY_ROWS = 9
const LABEL_COLUMNS = 3
// F08-R13: every row starts with a 2-column slot, "▸ " on the selected one.
const MARK = '▸ '
const MARK_COLUMNS = 2

const badge = (n: FileNode) =>
  n.change === 'edited' ? `edited +${n.added} −${n.removed}` : n.change === 'created' ? `created +${n.added}` : n.change

/**
 * `● path  edited +3 −1  ≈414 · 49 lines` in at most `columns` columns: the badge is left out when the file has no change.
 * The path gives way first, cut from its start and led by "…" (F08-R6); while not even "…" and the file name fit, the size and then the badge are dropped.
 */
function row(n: FileNode, columns: number) {
  const head = `${GLYPH[n.state]} `
  const name = n.path.slice(n.path.lastIndexOf('/') + 1)
  const parts = [badge(n), n.mainLoop ? '' : 'agent', `≈${n.tokens ?? '?'} · ${n.seen}`].filter(Boolean)
  const suffix = () => parts.map(p => `  ${p}`).join('')
  const room = () => columns - cols(head + suffix())
  while (parts.length && cols(n.path) > room() && cols(name) + 1 > room()) parts.pop()
  const path = cols(n.path) <= room() ? n.path : `…${tail(n.path, room() - 1)}` // ponytail: a file name wider than the pane loses its start too
  return head + path + suffix()
}

// F08-R6: the meter is cut from its end and closed by "…". ponytail: the line is ASCII plus "≈ · –", one column each; no width table.
const fit = (line: string, columns: number) => (cols(line) <= columns ? line : `${[...line].slice(0, columns - 1).join('')}…`)

export function renderList({ Box, Text, Button }: Table, graph: Graph, fill: Fill | null, columns: number, selected: string | null, select: (path: string) => void) {
  const files = Object.values(graph.files).sort((a, b) => b.touched - a.touched)
  return (
    <Box flexDirection="column">
      <Text>{fit(meterLine(graph, fill), columns)}</Text>
      <Text bold>Files</Text>
      {files.length === 0 && <Text dimColor>Nothing read yet.</Text>}
      {files.map((n, i) => (
        // F08-R8: the first nine rows give up the label's columns.
        <Button plain key={n.path} hotkey={i < HOTKEY_ROWS ? String(i + 1) : undefined} onPress={() => select(n.path)}>
          <Text>{n.path === selected ? MARK : ' '.repeat(MARK_COLUMNS)}</Text>
          <Text>{row(n, columns - MARK_COLUMNS - (i < HOTKEY_ROWS ? LABEL_COLUMNS : 0))}</Text>
        </Button>
      ))}
    </Box>
  )
}
