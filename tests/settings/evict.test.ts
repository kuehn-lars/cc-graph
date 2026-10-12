import wide from '../../fixtures/sessions/wide'
import { expect, test } from 'claude-code/testing'
import { graphOf, replayAll } from '../events/kit'

test('F14-AC1 a cap of 20 holds the wide session to 20 files and keeps the three changed ones', { options: { maxNodes: 20 } }, async ($, on) => {
  await replayAll($, on, wide)
  const files = Object.values((await graphOf())!.files)
  expect(files).toHaveLength(20)
  // I5: all 26 are `read` or changed, so the oldest reads go: m01 to m06 (turn 1, first touched).
  expect(files.map(n => n.path)).not.toContain('src/m06.ts')
  expect(files.map(n => n.path)).toContain('src/m07.ts')
  expect(files.filter(n => n.change).map(n => n.path).sort()).toEqual(['src/m14.ts', 'src/m20.ts', 'src/m25.ts'])
})

test('F14-AC1 at the default cap of 60 the wide session loses nothing', async ($, on) => {
  await replayAll($, on, wide)
  expect(Object.keys((await graphOf())!.files).length).toBe(26)
})
