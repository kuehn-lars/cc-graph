// Pure: the terminal graph view. Takes the element table from `$.ui.resolve(e)` and the graph; returns a tree.
import type { Elements } from 'claude-code'
import type { Fill, Graph, Layout, MemoryNote } from '../../types'
import { fileName } from '../layout/seed'
import { encode, paint } from './cells'
import { legendLines } from './legend'
import { FOOTER_NOTES, edgeWords, fit } from './list'
import { meterSegs } from './meter'
import { TONE, changeParts, nowNode } from './palette'
import { cols, cutSegs, tail, type Seg } from './width'

type Table = Pick<Elements['terminal'], 'Box' | 'Text' | 'Raster'>

// F09-R11: the view keys and the meter line above the graph, the now line (R18) and two legend lines (R28) under it.
const HEADER_ROWS = 2
const NOW_ROWS = 1
const LEGEND_ROWS = 2
// F09-R2
export const MIN_ROWS = 8
export const TOO_SHORT = 'Graph needs a taller pane'
// F09-R1: the most a Raster can be.
const MAX_COLUMNS = 512
const MAX_ROWS = 256

/** The rows the raster gets of `bodyRows`, less the header, the now line, the legend and the footer notes; below `MIN_ROWS` the list is drawn. */
export const graphRows = (bodyRows: number, notes: string[]) => Math.min(bodyRows - HEADER_ROWS - NOW_ROWS - LEGEND_ROWS - Math.min(notes.length, FOOTER_NOTES), MAX_ROWS)

/** The columns the raster gets of `bodyColumns`. */
export const graphColumns = (bodyColumns: number) => Math.min(bodyColumns, MAX_COLUMNS)

/** The frame the pane draws, with the pulse's border `step` on each node in `pulse` (F09-R27). */
export const frame = (graph: Graph, layout: Layout, columns: number, rows: number, selected: string | null, pulse: string[] = [], step = 0) =>
  encode(paint(graph, layout, columns, rows, selected, pulse, step))

/** F09-R18: `⏺ now  src/auth/login.ts  +2 −0  · imports 3`, the mark in Claude's colour, the folder dimmed and the file name bold; the path gives way first, cut from its start. */
function nowLine({ Text }: Pick<Table, 'Text'>, graph: Graph, columns: number) {
  const n = nowNode(graph)
  if (!n) return <Text dimColor>Nothing read yet.</Text>
  const head = '⏺ now  ', parts = changeParts(n), edge = edgeWords(graph).get(n.path)
  // The list words go first, then the change word, while not even the file name fits beside them.
  let change = parts.length ? `  ${parts.map(([t]) => t).join('')}` : '', words = edge ? `  · ${edge}` : ''
  if (cols(head + fileName(n.path) + change + words) > columns) words = ''
  if (cols(head + fileName(n.path) + change) > columns) change = ''
  const room = columns - cols(head + change + words)
  const path = cols(n.path) <= room ? n.path : `…${tail(n.path, room - 1)}` // ponytail: a file name wider than the pane loses its start too
  const slash = path.lastIndexOf('/') + 1
  return (
    <Text>
      <Text color={TONE.claude.key}>⏺</Text>
      <Text dimColor>{head.slice(1)}</Text>
      <Text dimColor>{path.slice(0, slash)}</Text>
      <Text bold>{path.slice(slash)}</Text>
      {change && <Text>{'  '}{parts.map(([t, tone], i) => <Text key={`c${i}`} color={tone.key}>{t}</Text>)}</Text>}
      {words && <Text dimColor>{words}</Text>}
    </Text>
  )
}

/** A line of segments cut to `columns` (F09-R21), `key` for the test and the engine; an empty line keeps its row. */
function segLine({ Text }: Pick<Table, 'Text'>, key: string, segs: Seg[], columns: number) {
  const line = cutSegs(segs, columns)
  return (
    <Text key={key}>
      {line.length ? line.map((s, i) => <Text key={`s${i}`} color={s.color} dimColor={s.dim}>{s.text}</Text>) : ' '}
    </Text>
  )
}

export function renderGraph({ Box, Text, Raster }: Table, graph: Graph, layout: Layout, memory: MemoryNote[], fill: Fill | null, notes: string[], columns: number, rows: number, selected: string | null) {
  const width = graphColumns(columns)
  return (
    <Box flexDirection="column">
      {segLine({ Text }, 'meter', meterSegs(graph, fill), columns)}
      <Raster key="graph" columns={width} rows={rows} cells={frame(graph, layout, width, rows, selected)} />
      {nowLine({ Text }, graph, columns)}
      {legendLines(graph, memory).map((segs, i) => segLine({ Text }, `legend-${i + 1}`, segs, columns))}
      {notes.slice(-FOOTER_NOTES).map((n, i) => <Text key={`note-${i}`} dimColor>{fit(n, columns)}</Text>)}
    </Box>
  )
}
