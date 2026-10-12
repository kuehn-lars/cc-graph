// Pure: a Read's result becomes a `fileRead` action, or null for a kind not tracked yet (file_unchanged).
import type { FileRead } from '../model/fileRead'
import { estimateTokens, plural } from './measure'

type TextFile = { content: string; numLines: number; startLine: number; totalLines: number; truncatedByTokenCap?: boolean }
type ReadResult = { type: 'text'; file: TextFile } | { type: string }

function text(path: string, readId: string, f: TextFile): FileRead {
  const isWhole = f.startLine === 1 && f.numLines >= f.totalLines && !f.truncatedByTokenCap
  return {
    type: 'fileRead', path, readId, state: isWhole ? 'read' : 'partial', tokens: estimateTokens(f.content),
    seen: isWhole ? plural(f.numLines, 'line') : `lines ${f.startLine} to ${f.startLine + f.numLines - 1} of ${f.totalLines}`,
  }
}

// F01-R2: what the pane cannot estimate shows as `read` with no tokens and a `seen` that names the kind.
const opaque = (path: string, readId: string, seen: string): FileRead =>
  ({ type: 'fileRead', path, readId, state: 'read', tokens: null, seen })

export function readAction(path: string, readId: string, result: ReadResult): FileRead | null {
  switch (result.type) {
    case 'text': return text(path, readId, (result as { file: TextFile }).file)
    case 'image': return opaque(path, readId, 'image')
    case 'pdf': return opaque(path, readId, 'PDF')
    case 'parts': {
      const { firstPage = 1, file } = result as { firstPage?: number; file?: { count?: number } }
      return opaque(path, readId, `PDF pages ${firstPage} to ${firstPage + (file?.count ?? 1) - 1}`)
    }
    case 'notebook': {
      const n = (result as { file?: { cells?: unknown[] } }).file?.cells?.length ?? 0
      return opaque(path, readId, `notebook, ${plural(n, 'cell')}`)
    }
    default: return null
  }
}
