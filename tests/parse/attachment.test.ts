import reference from '../../fixtures/sessions/reference'
import { expect, test } from 'claude-code/testing'
import { estimateTokens } from '../../hooks/parse/measure'
import { reattachedAction } from '../../hooks/parse/attachment'

const cwd = (reference.events[0]!.input as any).cwd
const rows = reference.events.filter(e => e.event === 'prompt.attachment' && e.process === 3 && e.input.type === 'file')
const login = (rows.find(r => r.input.text.includes('src/auth/login.ts'))!.input as any).text

test('F03-R3 the absolute path inside the cwd comes out relative, with the text\'s tokens', () => {
  expect(reattachedAction(login, cwd)).toEqual({ type: 'reattached', path: 'src/auth/login.ts', tokens: estimateTokens(login) })
})

test('F03-R3 all five recorded file attachments name a path inside the cwd', () => {
  expect(rows.map(r => reattachedAction((r.input as any).text, cwd)?.path).sort()).toEqual([
    'src/auth/login.ts', 'src/auth/sessions.ts', 'src/config.ts', 'src/db/redis.ts', 'src/middleware/rateLimit.ts'])
})

test('F03-R3 a text with no JSON first line gives nothing', () => {
  const nested = reference.events.find(e => e.event === 'prompt.attachment' && e.input.type === 'nested_memory')!.input as any
  expect(reattachedAction(nested.text, cwd)).toBeNull()
  expect(reattachedAction(login.replace('{"file_path"', '{"file_path'), cwd)).toBeNull() // DERIVED: broken JSON
  expect(reattachedAction('', cwd)).toBeNull()
})
