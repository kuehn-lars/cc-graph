import readImage from '../../fixtures/tool-results/read-image'
import readPdf from '../../fixtures/tool-results/read-pdf'
import readPdfParts from '../../fixtures/tool-results/read-pdf-parts'
import readNotebook from '../../fixtures/tool-results/read-notebook'
import readWhole from '../../fixtures/tool-results/read-whole'
import { expect, test } from 'claude-code/testing'
import { engine, nodeOf, start } from './kit'

const read = ($: any, file_path: string) => $.tool.call({ tool: 'Read', file_path })

test('F01-AC11 image read is read, tokens null, "image"', async ($, on) => {
  engine(on, readImage)
  await start($)
  await read($, '/w/docs/arch.png')
  const n = await nodeOf('docs/arch.png')
  expect(n?.state).toBe('read')
  expect(n?.tokens).toBe(null)
  expect(n?.seen).toBe('image')
})

test('F01-R2 pdf read is read, tokens null, "PDF"', async ($, on) => {
  engine(on, readPdf)
  await start($)
  await read($, '/w/doc.pdf')
  const n = await nodeOf('doc.pdf')
  expect([n?.state, n?.tokens, n?.seen]).toEqual(['read', null, 'PDF'])
})

test('F01-R2 pdf pages read says "PDF pages 1 to 2" from firstPage and file.count', async ($, on) => {
  engine(on, readPdfParts)
  await start($)
  await read($, '/w/doc.pdf')
  const n = await nodeOf('doc.pdf')
  expect([n?.state, n?.tokens, n?.seen]).toEqual(['read', null, 'PDF pages 1 to 2'])
})

test('F01-R2 notebook read says "notebook, 2 cells"', async ($, on) => {
  engine(on, readNotebook)
  await start($)
  await read($, '/w/notes.ipynb')
  const n = await nodeOf('notes.ipynb')
  expect([n?.state, n?.tokens, n?.seen]).toEqual(['read', null, 'notebook, 2 cells'])
})

// DERIVED: the singular and default wordings are the recorded results with a field changed (no session returns them by itself).
test('F01-R2 counts are singular at one and default when absent', async ($, on) => {
  const answer = engine(on, readNotebook)
  await start($)
  const seen = async (path: string, result: any) => (answer.result = result, await read($, '/w/' + path), (await nodeOf(path))?.seen)
  const { file } = readNotebook.result
  expect(await seen('one.ipynb', { ...readNotebook.result, file: { ...file, cells: file.cells.slice(0, 1) } })).toBe('notebook, 1 cell')
  expect(await seen('none.ipynb', { type: 'notebook', file: { filePath: 'none.ipynb' } })).toBe('notebook, 0 cells')
  expect(await seen('p.pdf', { type: 'parts', file: { filePath: 'p.pdf' } })).toBe('PDF pages 1 to 1')
  expect(await seen('one.ts', { type: 'text', file: { ...readWhole.result.file, content: 'x\n', numLines: 1, totalLines: 1 } })).toBe('1 line')
})
