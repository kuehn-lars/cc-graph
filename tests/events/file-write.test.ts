import writeCreate from '../../fixtures/tool-results/write-create'
import writeUpdate from '../../fixtures/tool-results/write-update'
import editReplaceAll from '../../fixtures/tool-results/edit-replace-all'
import { expect, test } from 'claude-code/testing'
import { engine, graphOf, nodeOf, start } from './kit'

const write = ($: any, file_path: string, content = '') => $.tool.call({ tool: 'Write', file_path, content })
const edit = ($: any, file_path: string) => $.tool.call({ tool: 'Edit', file_path, old_string: 'users', new_string: 'accounts', replace_all: true })

// The recording is a 14-line create (the spec's AC5 says 12; the count here is the recorded content's).
test('F01-AC5 a create Write is read, created, "written by Claude" and counts every line of the content', async ($, on) => {
  engine(on, writeCreate)
  await start($)
  await write($, '/w/src/middleware/rateLimit.ts')
  expect(await nodeOf('src/middleware/rateLimit.ts')).toMatchObject({
    state: 'read', change: 'created', seen: 'written by Claude', added: 14, removed: 0, line: 1,
    tokens: Math.ceil(writeCreate.result.content.length / 4),
  })
})

// ponytail: the Edit runs on the create's file with the recorded replace_all result (no recording of an Edit on a new file).
test('F01-AC6 an Edit after the create keeps created', async ($, on) => {
  const answer = engine(on, writeCreate)
  await start($)
  await write($, '/w/src/new.ts')
  answer.result = editReplaceAll.result as any
  await edit($, '/w/src/new.ts')
  expect(await nodeOf('src/new.ts')).toMatchObject({ state: 'read', change: 'created', added: 14 + 6, removed: 6 })
})

test('F01-R6 an update Write is edited and counts the patch (recorded: +1 line)', async ($, on) => {
  engine(on, writeUpdate)
  await start($)
  await write($, '/w/src/api/users.ts')
  expect(await nodeOf('src/api/users.ts')).toMatchObject({ state: 'read', change: 'edited', seen: 'written by Claude', added: 1, removed: 0, line: 1 })
})

test('F01-R6 an update Write over a created file keeps created', async ($, on) => {
  const answer = engine(on, writeCreate)
  await start($)
  await write($, '/w/src/x.ts')
  answer.result = writeUpdate.result as any
  await write($, '/w/src/x.ts')
  expect(await nodeOf('src/x.ts')).toMatchObject({ change: 'created', added: 15 })
})

// The empty-patch update is the recorded update with its patch emptied (the README records no such call).
test('F01-R6 an update Write with an empty patch adds no lines', async ($, on) => {
  engine(on, { ...writeUpdate, result: { ...writeUpdate.result, structuredPatch: [] } })
  await start($)
  await write($, '/w/src/api/users.ts')
  expect(await nodeOf('src/api/users.ts')).toMatchObject({ change: 'edited', added: 0, removed: 0, line: 1 })
})

// The empty create is the recorded create with its content emptied (the README records no such call).
test('F01-R6 a create Write of empty content adds no lines', async ($, on) => {
  engine(on, { ...writeCreate, result: { ...writeCreate.result, content: '' } })
  await start($)
  await write($, '/w/src/empty.ts')
  expect(await nodeOf('src/empty.ts')).toMatchObject({ change: 'created', added: 0, tokens: 0 })
})

// The staged result is the recorded create with the one field set (the README records no such call).
test('F01-AC13 a staged Write leaves the graph unchanged', async ($, on) => {
  engine(on, { ...writeCreate, result: { ...writeCreate.result, staged: true } })
  await start($)
  await write($, '/w/src/middleware/rateLimit.ts')
  expect(await graphOf()).toBe(undefined)
})
