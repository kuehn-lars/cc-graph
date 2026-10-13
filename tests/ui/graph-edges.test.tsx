import { expect, test } from 'claude-code/testing'
import { SURFACES, mount, node, start, ui, viewLaidOut } from './kit'

test('NFR-P3 a render of 60 nodes and 120 edges builds its tree in under 16 ms on each surface', async ($, on) => {
  ui(on, { isPlaced: true }, SURFACES)
  const nodes = Array.from({ length: 60 }, (_, i) => node(`src/d${i % 6}/f${i}.ts`, i + 1))
  const edges = Array.from({ length: 120 }, (_, i) => [nodes[i % 60]!.path, nodes[(i * 7 + 1) % 60]!.path] as [string, string])
  viewLaidOut(on, nodes, edges, Object.fromEntries(nodes.map((n, i) => [n.path, { x: (i * 37) % 100, y: (i * 23) % 64 }])))
  await start($)
  for (const surface of SURFACES) {
    const times: number[] = []
    for (let i = 0; i < 5; i++) { // the best of five: the suite runs its files in parallel
      const t = performance.now()
      const pane = await mount($, surface, 120, 50)
      times.push(performance.now() - t)
      await pane.unmount()
    }
    expect(Math.min(...times), surface).toBeLessThan(16)
  }
})
