// Shared setup for UI tests: the Pane props the engine would hand the hook, and the test's own hooks beneath.
import type { On, RenderSurface } from 'claude-code'

export const PANE_ID = 'cc-graph'
export const SURFACES = ['terminal', 'desktop'] as const satisfies readonly RenderSurface[]

export const paneProps = (bodyColumns = 64) => ({
  title: 'CC Graph', isFocused: true, bodyColumns, placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 30 }, view: {},
})

/** The person typing `/graph` (or `/graph <args>`) in the composer of a 160-column fullscreen terminal. */
export const run = ($: any, args = '') =>
  $.command.run({ command: 'graph', args, origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })

/** The bottom hooks for `/graph`: `ui.open` answers `placed` and records its calls, `ui.toast` records its text, `command.register` records the command. */
export function ui(on: On, placed: { isPlaced: true } | { isPlaced: false; reason: string } = { isPlaced: true }) {
  const opened: any[] = []
  const toasts: string[] = []
  const registered: any[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => (registered.push(e), { value: { command: e.name } }))
  on('ui.open', (_$, e) => (opened.push(e), { value: placed }))
  on('ui.toast', (_$, e) => (toasts.push(e.text), { value: undefined }))
  return { opened, toasts, registered }
}
