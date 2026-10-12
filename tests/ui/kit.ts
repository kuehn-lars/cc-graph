// Shared setup for UI tests: the Pane props the engine would hand the hook, and the test's own hooks beneath.
import type { On, RenderSurface } from 'claude-code'
import type { FileNode, Graph } from '../../types'

export const PANE_ID = 'cc-graph'
export const SURFACES = ['terminal', 'desktop', 'vscode', 'mobile'] as const satisfies readonly RenderSurface[]

export const paneProps = (bodyColumns = 64) => ({
  title: 'CC Graph', isFocused: true, bodyColumns, placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 30 }, view: {},
})

export const start = ($: any) => $.session.start({ cwd: '/w', surface: null, isInteractive: false })

/** The Pane of this plugin drawn on `surface`, `bodyColumns` wide. */
export const mount = ($: any, surface: RenderSurface, bodyColumns = 64) =>
  $.ui.mount({ plugin: 'cc-graph', surface, component: 'Pane', requestId: PANE_ID, props: paneProps(bodyColumns) })

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
