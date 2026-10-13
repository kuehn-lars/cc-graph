// Pure: the terminal graph view. Takes the element table from `$.ui.resolve(e)` and the graph; returns a tree.
import type { Elements } from 'claude-code'
import type { Fill, Graph, Layout, MemoryNote } from '../../types'
import { encode, paint } from './cells'
import { legendLine } from './legend'
import { FOOTER_NOTES, fit } from './list'
import { meterLine } from './meter'

type Table = Pick<Elements['terminal'], 'Box' | 'Text' | 'Raster'>

// F09-R1: the view keys and the meter line above the raster, the legend line under it.
const HEADER_ROWS = 2
const LEGEND_ROWS = 1
// F09-R2
export const MIN_ROWS = 8
export const TOO_SHORT = 'Graph needs a taller pane'
// F09-R1: the most a Raster can be.
const MAX_COLUMNS = 512
const MAX_ROWS = 256

/** The rows the raster gets of `bodyRows`, less the header and the footer notes; below `MIN_ROWS` the list is drawn. */
export const graphRows = (bodyRows: number, notes: string[]) => Math.min(bodyRows - HEADER_ROWS - LEGEND_ROWS - Math.min(notes.length, FOOTER_NOTES), MAX_ROWS)

/** The columns the raster gets of `bodyColumns`. */
export const graphColumns = (bodyColumns: number) => Math.min(bodyColumns, MAX_COLUMNS)

/** The frame the pane draws, with a ring around each node in `pulse` (F09-R19). */
export const frame = (graph: Graph, layout: Layout, columns: number, rows: number, selected: string | null, pulse: string[] = []) =>
  encode(paint(graph, layout, columns, rows, selected, pulse))

export function renderGraph({ Box, Text, Raster }: Table, graph: Graph, layout: Layout, memory: MemoryNote[], fill: Fill | null, notes: string[], columns: number, rows: number, selected: string | null) {
  const width = graphColumns(columns)
  return (
    <Box flexDirection="column">
      <Text>{fit(meterLine(graph, fill), columns)}</Text>
      <Raster key="graph" columns={width} rows={rows} cells={frame(graph, layout, width, rows, selected)} />
      <Text dimColor>{fit(legendLine(graph, memory), columns) || ' '}</Text>
      {notes.slice(-FOOTER_NOTES).map((n, i) => <Text key={`note-${i}`} dimColor>{fit(n, columns)}</Text>)}
    </Box>
  )
}
