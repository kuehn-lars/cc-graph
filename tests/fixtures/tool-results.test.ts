import readWhole from '../../fixtures/tool-results/read-whole'
import readRanged from '../../fixtures/tool-results/read-ranged'
import readTokenCapped from '../../fixtures/tool-results/read-token-capped'
import readImage from '../../fixtures/tool-results/read-image'
import readPdf from '../../fixtures/tool-results/read-pdf'
import readPdfParts from '../../fixtures/tool-results/read-pdf-parts'
import readNotebook from '../../fixtures/tool-results/read-notebook'
import editReplaceAll from '../../fixtures/tool-results/edit-replace-all'
import writeCreate from '../../fixtures/tool-results/write-create'
import writeUpdate from '../../fixtures/tool-results/write-update'
import notebookEdit from '../../fixtures/tool-results/notebook-edit'
import { expect, test } from 'claude-code/testing'

// F01 ticket 01: the recorded tool results keep their id, input and result as the session produced them.
const fixtures: Record<string, any> = { 'read-whole': readWhole, 'read-ranged': readRanged, 'read-token-capped': readTokenCapped, 'read-image': readImage, 'read-pdf': readPdf, 'read-pdf-parts': readPdfParts, 'read-notebook': readNotebook, 'edit-replace-all': editReplaceAll, 'write-create': writeCreate, 'write-update': writeUpdate, 'notebook-edit': notebookEdit }

const shapes: Record<string, [tool: string, check: (r: any, input: any) => unknown]> = {
  'read-whole': ['Read', (r) => expect(r.type).toBe('text')],
  'read-ranged': ['Read', (r, i) => (expect(r.type).toBe('text'), expect(i.limit).toBe(40), expect(r.file.totalLines).toBeGreaterThan(r.file.numLines))],
  'read-token-capped': ['Read', (r) => expect(r.file.truncatedByTokenCap).toBe(true)],
  'read-image': ['Read', (r) => expect(r.type).toBe('image')],
  'read-pdf': ['Read', (r) => expect(r.type).toBe('pdf')],
  'read-pdf-parts': ['Read', (r, i) => (expect(r.type).toBe('parts'), expect(i.pages).toBe('1-2'))],
  'read-notebook': ['Read', (r) => expect(r.type).toBe('notebook')],
  'edit-replace-all': ['Edit', (r) => (expect(r.replaceAll).toBe(true), expect(r.structuredPatch.length).toBeGreaterThan(1))],
  'write-create': ['Write', (r) => expect(r.type).toBe('create')],
  'write-update': ['Write', (r) => expect(r.type).toBe('update')],
  'notebook-edit': ['NotebookEdit', (r) => expect(r.error).toBe('')],
}

for (const [name, [tool, check]] of Object.entries(shapes))
  test(`F01 ticket 01: fixture ${name} is a recorded ${tool} call`, async () => {
    const f = fixtures[name]
    expect(f.tool).toBe(tool)
    expect(f.tool_use_id).toMatch(/^toolu_/)
    expect(f.input).toBeTruthy()
    check(f.result, f.input)
  })
