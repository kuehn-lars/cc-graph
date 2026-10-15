import { expect, test } from 'claude-code/testing'
import type { Graph } from '../../types'
import { decode, mount, node, start, ui } from './kit'

const ERROR = 0xff6b80
const draw = async ($: any, on: any, blind: boolean) => {
  const nodes = [node('src/auth/login.ts', 2, { change: 'edited' }), node('src/api/users.ts', 1, { state: 'ghost', mainLoop: false })]
  const graph: Graph = {
    seq: 2, files: Object.fromEntries(nodes.map(n => [n.path, n])), decisions: [], compactions: [],
    edges: [{ from: 'src/api/users.ts', to: 'src/auth/login.ts', kind: 'import', blind, guessed: false }],
  }
  const layout = { 'src/api/users.ts': { x: 25, y: 10 }, 'src/auth/login.ts': { x: 75, y: 50 } }
  const values: Record<string, unknown> = { view: 'graph', graph, layout }
  ui(on)
  on('state.get', async (_$: any, e: any, next: any) => (e.key in values ? ({ value: { value: values[e.key], version: 0 } } as any) : next(e)))
  await start($)
  return decode(await (await mount($, 'terminal', 100, 40)).find({ type: 'Raster' }))
}

test('F09-AC44 a blind edge is dashed in the error colour; the same edge, not blind, is solid', async ($, on) => {
  const dashed = (await draw($, on, true)).filter(c => c.char === '╎' || c.char === '╌')
  expect(dashed.length).toBeGreaterThan(0)
  expect(dashed.every(c => c.fg === ERROR)).toBe(true)
})

test('F09-AC44 an edge that is not blind has no dashed cell', async ($, on) => {
  const cells = await draw($, on, false)
  expect(cells.some(c => c.char === '╎' || c.char === '╌')).toBe(false)
  expect(cells.some(c => c.char === '│')).toBe(true)
})
