// node scripts/record-tool-results.mjs <outDir> <transcript.jsonl>...
// Reads tool_use (id, input) and the paired toolUseResult from Claude Code session transcripts and writes
// one fixtures/tool-results/<name>.ts per recording. Nothing is edited. See fixtures/tool-results/README.md.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const [out, ...files] = process.argv.slice(2)
const calls = []
for (const f of files) {
  const uses = new Map()
  for (const line of readFileSync(f, 'utf8').split('\n').filter(Boolean)) {
    const row = JSON.parse(line)
    for (const b of Array.isArray(row.message?.content) ? row.message.content : []) {
      if (b.type === 'tool_use') uses.set(b.id, b)
      if (b.type === 'tool_result' && uses.has(b.tool_use_id) && !b.is_error) {
        const u = uses.get(b.tool_use_id)
        calls.push({ tool: u.name, tool_use_id: u.id, input: u.input, result: row.toolUseResult })
      }
    }
  }
}

const find = (tool, pred) => calls.find((c) => c.tool === tool && pred(c.result ?? {}, c.input))
const picks = {
  'read-whole': ['Read', (r, i) => r.type === 'text' && i.limit === undefined && i.file_path.endsWith('login.ts')],
  'read-ranged': ['Read', (r, i) => r.type === 'text' && i.limit === 40],
  'read-token-capped': ['Read', (r, i) => r.file?.truncatedByTokenCap && !i.allow_large],
  'read-image': ['Read', (r) => r.type === 'image'],
  'read-pdf': ['Read', (r) => r.type === 'pdf'],
  'read-pdf-parts': ['Read', (r) => r.type === 'parts'],
  'read-notebook': ['Read', (r) => r.type === 'notebook'],
  'edit-replace-all': ['Edit', (r) => r.replaceAll && r.structuredPatch.length > 1],
  'write-create': ['Write', (r) => r.type === 'create'],
  'write-update': ['Write', (r) => r.type === 'update'],
  'notebook-edit': ['NotebookEdit', (r) => !r.error],
}
mkdirSync(out, { recursive: true })
for (const [name, [tool, pred]] of Object.entries(picks)) {
  const c = find(tool, pred)
  if (!c) console.error(`not found: ${name}`)
  else writeFileSync(`${out}/${name}.ts`, `export default ${JSON.stringify(c, null, 2)}\n`)
}
