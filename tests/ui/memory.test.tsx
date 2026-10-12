import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { MemoryNote } from '../../types'
import { mount, start, ui } from './kit'

/** The test's own `state.get` hook beneath the mod: every read of `memory` answers these notes. */
const seedMemory = (on: On, ...notes: MemoryNote[]) =>
  on('state.get', async (_$, e: any, next) => (e.key === 'memory' ? ({ value: { value: notes, version: 0 } } as any) : next(e)))

const note = (path: string, type: string, tokens: number | null, reason: string | null = null): MemoryNote => ({ path, type, tokens, reason })
const texts = async (pane: any, text: RegExp) => (await pane.findAll({ type: 'Text', text })).map((t: any) => t.text)

test('F04-R4 the Memory section shows type, path, reason and size per note, and the total with unknowns counted apart', async ($, on) => {
  ui(on)
  seedMemory(on, note('CLAUDE.md', 'Project', 120, 'at start'), note('src/auth/CLAUDE.md', 'Project', null, 'nested'), note('/home/user/.claude/CLAUDE.md', 'User', 30))
  await start($)
  const pane = await mount($, 'terminal')
  expect(await texts(pane, /^■ /)).toEqual([
    '■ Project  CLAUDE.md  at start  ≈120',
    '■ Project  src/auth/CLAUDE.md  nested  ≈?',
    '■ User  /home/user/.claude/CLAUDE.md  ≈30',
  ])
  expect(await texts(pane, /^Memory/)).toEqual(['Memory  ≈150 (+1 unknown)'])
})

test('F04-R4 an empty memory shows no rows', async ($, on) => {
  ui(on)
  await start($)
  const pane = await mount($, 'terminal')
  expect(await texts(pane, /^■ /)).toEqual([])
  expect(await texts(pane, /^Memory/)).toEqual([])
})
