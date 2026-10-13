import readWhole from '../../fixtures/tool-results/read-whole'
import { expect, test } from 'claude-code/testing'
import { SURFACES, mount, rowButtons, run, ui } from './kit'

// NFR-C2: on every surface the hooks run and the list is drawn (no surface has shipped a graph renderer yet, F08-R10).
for (const surface of SURFACES) {
  test(`NFR-C2 on ${surface} a session with a Read and /graph runs without error and the list draws its row`, async ($, on) => {
    const { toasts } = ui(on, { isPlaced: true }, [surface])
    on('turn.start', (_$, e) => ({ turnId: e.turnId }))
    on('tool.call', () => ({ ref: 0, result: readWhole.result, text: '' }))
    await $.session.start({ cwd: '/w', surface, isInteractive: true })
    await $.turn.start({ text: '', turnId: 't1' })
    await $.tool.call({ tool: 'Read', file_path: '/w/src/auth/login.ts' })
    expect((await run($)).text).toBe('CC Graph opened.')
    const pane = await mount($, surface)
    expect((await rowButtons(pane)).map(b => b.key)).toEqual(['src/auth/login.ts'])
    expect(toasts).toEqual([])
  })
}
