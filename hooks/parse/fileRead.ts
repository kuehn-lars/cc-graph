// Pure: a Read's result becomes a `fileRead` action, or null when this ticket does not track its kind.
// A later ticket adds a `case` per kind (image, pdf, parts, notebook, file_unchanged).
import type { FileRead } from '../model/fileRead'

type TextFile = { content: string; numLines: number; startLine: number; totalLines: number; truncatedByTokenCap?: boolean }
type ReadResult = { type: 'text'; file: TextFile } | { type: string }

const lines = (n: number) => `${n} line${n === 1 ? '' : 's'}`

function text(path: string, readId: string, f: TextFile): FileRead {
  const isWhole = f.startLine === 1 && f.numLines >= f.totalLines && !f.truncatedByTokenCap
  return {
    type: 'fileRead', path, readId, state: isWhole ? 'read' : 'partial', tokens: Math.ceil(f.content.length / 4),
    seen: isWhole ? lines(f.numLines) : `lines ${f.startLine} to ${f.startLine + f.numLines - 1} of ${f.totalLines}`,
  }
}

export function readAction(path: string, readId: string, result: ReadResult): FileRead | null {
  switch (result.type) {
    case 'text': return text(path, readId, (result as { file: TextFile }).file)
    default: return null
  }
}
