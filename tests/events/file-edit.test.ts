import readWhole from '../../fixtures/tool-results/read-whole'
import editReplaceAll from '../../fixtures/tool-results/edit-replace-all'
import notebookEdit from '../../fixtures/tool-results/notebook-edit'
import { expect, test } from 'claude-code/testing'
import { engine, graphOf, nodeOf, start } from './kit'

const edit = ($: any, file_path: string) => $.tool.call({ tool: 'Edit', file_path, old_string: 'users', new_string: 'accounts', replace_all: true })
const notebook = ($: any, notebook_path: string) => $.tool.call({ tool: 'NotebookEdit', ...notebookEdit.input, notebook_path })

// ponytail: no recording of an Edit that turns 1 line into 3 exists (the README lists one Edit). The recorded
// replace_all patch has 6 plus and 6 minus lines in three hunks; this test proves the same rule
// (counts come from the patch, state stays) with it. Re-record to get +3 -1.
test('F01-AC4 (recorded patch, no +3 -1 recording) a read node stays read, becomes edited, counts the patch and points at the first hunk', async ($, on) => {
  const answer = engine(on, readWhole)
  await start($)
  await $.tool.call({ tool: 'Read', file_path: '/w/src/auth/login.ts' })
  answer.result = editReplaceAll.result as any
  await edit($, '/w/src/auth/login.ts')
  const n = await nodeOf($, 'src/auth/login.ts')
  expect(n).toMatchObject({ state: 'read', change: 'edited', seen: '49 lines', added: 6, removed: 6, line: 8 })
  expect(n?.tokens).toBe(Math.ceil(readWhole.result.file.content.length / 4))
})

test('F01-AC14 replace_all counts every hunk of the patch (recorded: 3 hunks, 6 plus and 6 minus lines)', async ($, on) => {
  engine(on, editReplaceAll)
  await start($)
  await edit($, '/w/src/auth/login.ts')
  const n = await nodeOf($, 'src/auth/login.ts')
  expect(n).toMatchObject({ added: 6, removed: 6, line: 8 })
  const patch: string[] = editReplaceAll.result.structuredPatch.flatMap(h => h.lines)
  expect([patch.filter(l => l[0] === '+').length, patch.filter(l => l[0] === '-').length]).toEqual([6, 6])
})

test('F01-R4 an edited file without a node starts partial, "only the edited lines"', async ($, on) => {
  engine(on, editReplaceAll)
  await start($)
  await edit($, '/w/src/auth/login.ts')
  expect(await nodeOf($, 'src/auth/login.ts')).toMatchObject({ state: 'partial', seen: 'only the edited lines', change: 'edited', tokens: null })
})

test('F01-R4 a second edit adds to the counts', async ($, on) => {
  engine(on, editReplaceAll)
  await start($)
  await edit($, '/w/src/auth/login.ts')
  await edit($, '/w/src/auth/login.ts')
  expect(await nodeOf($, 'src/auth/login.ts')).toMatchObject({ added: 12, removed: 12 })
})

test('F01-R5 a notebook edit counts the lines of new and old source', async ($, on) => {
  engine(on, notebookEdit)
  await start($)
  await notebook($, '/w/notes.ipynb')
  expect(await nodeOf($, 'notes.ipynb')).toMatchObject({ state: 'partial', seen: 'only the edited lines', change: 'edited', added: 1, removed: 2 })
})

// The staged and error results are the recorded ones with the one field set (the README records no such call).
test('F01-R8 a staged Edit leaves the graph unchanged', async ($, on) => {
  engine(on, { ...editReplaceAll, result: { ...editReplaceAll.result, staged: true } })
  await start($)
  await edit($, '/w/src/auth/login.ts')
  expect(await graphOf($)).toBe(undefined)
})

test('F01-R8 a NotebookEdit with an error leaves the graph unchanged', async ($, on) => {
  engine(on, { ...notebookEdit, result: { ...notebookEdit.result, error: 'Cell with ID "calc" not found in notebook.' } })
  await start($)
  await notebook($, '/w/notes.ipynb')
  expect(await graphOf($)).toBe(undefined)
})
