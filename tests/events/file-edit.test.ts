import readWhole from '../../fixtures/tool-results/read-whole'
import editReplaceAll from '../../fixtures/tool-results/edit-replace-all'
import notebookEdit from '../../fixtures/tool-results/notebook-edit'
import { expect, test } from 'claude-code/testing'
import { engine, graphOf, nodeOf, start } from './kit'

const edit = ($: any, file_path: string) => $.tool.call({ tool: 'Edit', file_path, old_string: 'users', new_string: 'accounts', replace_all: true })
const notebook = ($: any, notebook_path: string) => $.tool.call({ tool: 'NotebookEdit', ...notebookEdit.input, notebook_path })

// The recorded replace_all Edit is the one Edit recording; AC4 asserts what its written patch holds (6 plus, 6 minus lines).
const patchLines = (sign: string) => editReplaceAll.result.structuredPatch.flatMap(h => h.lines).filter(l => l[0] === sign).length
test('F01-AC4 a read node stays read, becomes edited, counts the + and - lines of the written patch and points at the first hunk', async ($, on) => {
  const answer = engine(on, readWhole)
  await start($)
  await $.tool.call({ tool: 'Read', file_path: '/w/src/auth/login.ts' })
  answer.result = editReplaceAll.result as any
  await edit($, '/w/src/auth/login.ts')
  const n = await nodeOf('src/auth/login.ts')
  expect(n).toMatchObject({ state: 'read', change: 'edited', seen: '49 lines', added: patchLines('+'), removed: patchLines('-'), line: 8 })
  expect([n?.added, n?.removed]).toEqual([6, 6])
  expect(n?.tokens).toBe(Math.ceil(readWhole.result.file.content.length / 4))
})

test('F01-AC14 replace_all counts the + and - lines across all hunks (recorded: 3 hunks, +6 -6)', async ($, on) => {
  engine(on, editReplaceAll)
  await start($)
  await edit($, '/w/src/auth/login.ts')
  const n = await nodeOf('src/auth/login.ts')
  expect(n).toMatchObject({ added: 6, removed: 6, line: 8 })
  const patch: string[] = editReplaceAll.result.structuredPatch.flatMap(h => h.lines)
  expect([patch.filter(l => l[0] === '+').length, patch.filter(l => l[0] === '-').length]).toEqual([6, 6])
})

test('F01-R4 an edited file without a node starts partial, "only the edited lines"', async ($, on) => {
  engine(on, editReplaceAll)
  await start($)
  await edit($, '/w/src/auth/login.ts')
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ state: 'partial', seen: 'only the edited lines', change: 'edited', tokens: null })
})

test('F01-R4 a second edit adds to the counts', async ($, on) => {
  engine(on, editReplaceAll)
  await start($)
  await edit($, '/w/src/auth/login.ts')
  await edit($, '/w/src/auth/login.ts')
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ added: 12, removed: 12 })
})

test('F01-R5 a notebook edit counts the lines of new and old source', async ($, on) => {
  engine(on, notebookEdit)
  await start($)
  await notebook($, '/w/notes.ipynb')
  expect(await nodeOf('notes.ipynb')).toMatchObject({ state: 'partial', seen: 'only the edited lines', change: 'edited', added: 1, removed: 2 })
})

// DERIVED: the staged and error results are the recorded ones with the one field set (no session returns them by itself).
test('F01-R8 a staged Edit leaves the graph unchanged', async ($, on) => {
  engine(on, { ...editReplaceAll, result: { ...editReplaceAll.result, staged: true } })
  await start($)
  await edit($, '/w/src/auth/login.ts')
  expect(await graphOf()).toBe(undefined)
})

test('F01-R8 a NotebookEdit with an error leaves the graph unchanged', async ($, on) => {
  engine(on, { ...notebookEdit, result: { ...notebookEdit.result, error: 'Cell with ID "calc" not found in notebook.' } })
  await start($)
  await notebook($, '/w/notes.ipynb')
  expect(await graphOf()).toBe(undefined)
})
