import readWhole from '../../fixtures/tool-results/read-whole'
import editReplaceAll from '../../fixtures/tool-results/edit-replace-all'
import { expect, test } from 'claude-code/testing'
import { engine, replay } from '../events/kit'
import { node, run, seed, start, ui } from './kit'


test('F08-AC8 with no surface and the graph at RS-1, /graph opens no pane and answers the counts', async ($, on) => {
  const { opened } = ui(on, undefined, [])
  await replay($, on, 3)
  const out = await run($)
  expect(opened).toEqual([])
  expect(out.text).toContain('1 read, 1 partial, 1 search')
})

test('F08-R4 change counts follow the state counts, zero counts are left out', async ($, on) => {
  ui(on, undefined, [])
  seed(on,
    node('a', 1, { state: 'ghost' }),
    node('b', 2, { state: 'compacted', change: 'edited' }),
    node('c', 3, { state: 'unread', change: 'blind' }),
    node('d', 4, { change: 'created' }),
    node('e', 5, { change: 'created' }),
    node('f', 6, { state: 'unread' }),
  )
  await start($)
  const out = await run($)
  expect(out.text).toBe('≈200 in 2 files · window –\n2 read, 1 compacted, 2 unread, 1 ghost\n1 edited, 2 created, 1 blind')
})

test('F08-R4 an empty graph says so', async ($, on) => {
  ui(on, undefined, [])
  await start($)
  expect((await run($)).text).toBe('≈0 in 0 files · window –\nNothing read yet.')
})

test('NFR-C3 with no surface every F01 hook and /graph run without error', async ($, on) => {
  const answer = engine(on, readWhole)
  on('prompt.mention', () => ({ type: 'file' }))
  const opened: any[] = []
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.open', (_$, e) => (opened.push(e), { value: { isPlaced: true } }))
  on('session.surfaces', () => ({ value: [] }))
  await start($)
  await $.turn.start({ text: '', turnId: 't1' })
  await $.tool.call({ tool: 'Read', file_path: '/w/src/auth/login.ts' })
  answer.result = editReplaceAll.result as any
  await $.tool.call({ tool: 'Edit', file_path: '/w/src/auth/login.ts', old_string: 'users', new_string: 'accounts', replace_all: true })
  await $.prompt.mention({ mention: 'src/b.ts', path: '/w/src/b.ts' })
  const out = await run($)
  expect(opened).toEqual([])
  expect(out.text).toMatch(/\n2 read, 2 ghost\n1 edited$/)
})
