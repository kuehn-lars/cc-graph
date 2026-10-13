// Shared setup for UI tests: the Pane props the engine would hand the hook, and the test's own hooks beneath.
import type { On, RenderSurface } from 'claude-code'
import type { FileNode, Graph, MemoryNote } from '../../types'

export const PANE_ID = 'cc-graph'
export const SURFACES = ['terminal', 'desktop', 'vscode', 'mobile'] as const satisfies readonly RenderSurface[]

export const paneProps = (bodyColumns = 64, bodyRows = 30) => ({
  title: 'CC Graph', isFocused: true, bodyColumns, placement: 'dock' as const,
  scroll: { offset: 0, bodyRows }, view: {},
})

export const start = ($: any) => $.session.start({ cwd: '/w', surface: null, isInteractive: false })

/** The Pane of this plugin drawn on `surface`, `bodyColumns` wide. */
export const mount = ($: any, surface: RenderSurface, bodyColumns = 64, bodyRows = 30) =>
  $.ui.mount({ plugin: 'cc-graph', surface, component: 'Pane', requestId: PANE_ID, props: paneProps(bodyColumns, bodyRows) })

/** The person typing `/graph` (or `/graph <args>`) in the composer of a 160-column fullscreen terminal. */
export const run = ($: any, args = '') =>
  $.command.run({ command: 'graph', args, origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })

/** The bottom hooks for `/graph`: `ui.open` answers `placed` and records its calls, `ui.toast` records its text, `command.register` records the command. */
export function ui(on: On, placed: { isPlaced: true } | { isPlaced: false; reason: string } = { isPlaced: true }, surfaces: readonly RenderSurface[] = ['terminal']) {
  const opened: any[] = []
  const toasts: string[] = []
  const registered: any[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.surfaces', () => ({ value: surfaces }))
  on('command.register', (_$, e) => (registered.push(e), { value: { command: e.name } }))
  on('ui.open', (_$, e) => (opened.push(e), { value: placed }))
  on('ui.toast', (_$, e) => (toasts.push(e.text), { value: undefined }))
  return { opened, toasts, registered }
}

/** A file node with the fields a test does not care about filled in. `touched` orders the list. */
export const node = (path: string, touched: number, over: Partial<FileNode> = {}): FileNode => ({
  path, state: 'read', change: null, reason: null, tokens: 100, seen: '10 lines', hits: 0, added: 0, removed: 0, line: null,
  readId: null, agents: [], mainLoop: true, firstTurn: 1, lastTurn: 1, touched, ...over,
})

/** The test's own `state.get` hook beneath the mod: every read of `graph` answers a graph holding these nodes. */
export function seed(on: On, ...nodes: FileNode[]) {
  const graph: Graph = {
    seq: Math.max(0, ...nodes.map(n => n.touched)),
    files: Object.fromEntries(nodes.map(n => [n.path, n])), edges: [], decisions: [], compactions: [],
  }
  on('state.get', async (_$, e: any, next) => (e.key === 'graph' ? ({ value: { value: graph, version: 0 } } as any) : next(e)))
}

/** What the mod wrote to state: every `state.set`, by key (the test `$` has no `state` noun). */
export function writes(on: On) {
  const seen: { key: string; value: unknown }[] = []
  on('state.set', (_$, e: any, next) => (seen.push({ key: e.key, value: e.value }), next(e)))
  return seen
}

/** The file row Buttons, in drawn order: the ones not keyed `view-*`. */
export const rowButtons = async (pane: any): Promise<any[]> => (await pane.findAll({ type: 'Button' })).filter((b: any) => !b.key.startsWith('view-'))

/** The test's own `state.get` hook beneath the mod: `view` is `graph`, `notes` are seeded, and with `nodes` so is the graph; every other read passes on. */
export function viewGraph(on: On, notes: string[] = [], ...nodes: FileNode[]) {
  const values: Record<string, unknown> = { view: 'graph', ...(notes.length ? { notes } : {}) }
  if (nodes.length) values.graph = { seq: Math.max(...nodes.map(n => n.touched)), files: Object.fromEntries(nodes.map(n => [n.path, n])), edges: [], decisions: [], compactions: [] } satisfies Graph
  on('state.get', async (_$, e: any, next) => (e.key in values ? ({ value: { value: values[e.key], version: 0 } } as any) : next(e)))
}

/** The cells of a mounted `Raster`, row-major: its glyph, foreground and background. */
export function decode(raster: any): { char: string; fg: number; bg: number }[] {
  const words = new Uint32Array(Uint8Array.from(atob(raster.props.cells), c => c.charCodeAt(0)).buffer)
  return Array.from({ length: words.length / 3 }, (_, i) => ({ char: String.fromCodePoint(words[i * 3]!), fg: words[i * 3 + 1]!, bg: words[i * 3 + 2]! }))
}

/** The test's own `state.get` hook beneath the mod: `view` is `graph`, and `graph`, `layout` and (when given) `memory` hold these. */
export function viewLaidOut(on: On, nodes: FileNode[], edges: [string, string][], layout: Record<string, { x: number; y: number }>, memory: MemoryNote[] = [], selected: string | null = null) {
  const graph: Graph = {
    seq: Math.max(...nodes.map(n => n.touched)), files: Object.fromEntries(nodes.map(n => [n.path, n])),
    edges: edges.map(([from, to]) => ({ from, to, kind: 'import', blind: false, guessed: false })), decisions: [], compactions: [],
  }
  const values: Record<string, unknown> = { view: 'graph', graph, layout, ...(memory.length ? { memory } : {}), ...(selected ? { selected } : {}) }
  on('state.get', async (_$, e: any, next) => (e.key in values ? ({ value: { value: values[e.key], version: 0 } } as any) : next(e)))
}

type Decoded = { char: string; fg: number; bg: number }

/** The decoded cells as lines of text, `columns` wide. */
export const lines = (cells: Decoded[], columns: number) => Array.from({ length: cells.length / columns }, (_, r) => cells.slice(r * columns, (r + 1) * columns).map(c => c.char).join(''))

/**
 * The box whose middle row holds `name` after its glyph, or the tag (`boxed: false`, one row, from its glyph to the name's end) that does:
 * its rows of text, the cell at `(x, y)` of it, and where it sits.
 */
export function boxOf(cells: Decoded[], columns: number, name: string) {
  const rows = lines(cells, columns)
  const row = rows.findIndex(r => r.includes(` ${name}`))
  if (row < 0) return undefined
  const at = rows[row]!.indexOf(` ${name}`) + 1
  // A box's top side runs on over the glyph; a folder's frame has its title there (a tag at the frame's left).
  const boxed = '│┆├┤'.includes(rows[row]![at - 4] ?? 'x') && rows[row - 1]?.[at - 4] === '╭' && rows[row - 1]?.[at - 2] !== ' '
  const left = boxed ? at - 4 : at - 2
  let right = at + name.length - 1
  if (boxed) for (right = left + 1; rows[row - 1]![right] !== '╮'; right++);
  const top = boxed ? row - 1 : row
  return {
    boxed, left, right, top, bottom: boxed ? row + 1 : row,
    rows: rows.slice(top, boxed ? row + 2 : row + 1).map(r => r.slice(left, right + 1)),
    cell: (x: number, y: number) => cells[(top + y) * columns + left + x]!,
  }
}
