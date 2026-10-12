import { expect, test } from 'claude-code/testing'
import { normalize, worktreeOf } from '../../hooks/parse/path'

test('F15-R9 a path under .claude/worktrees/<name>/ inside the cwd drops the prefix and names the worktree', () => {
  expect(normalize('/w/.claude/worktrees/agent-a1/src/a.ts', '/w')).toBe('src/a.ts')
  expect(worktreeOf('/w/.claude/worktrees/agent-a1/src/a.ts', '/w')).toBe('agent-a1')
})

test('F15-R9 the worktrees folder alone, a worktree with no file, and a path outside the cwd stay as I4 had them', () => {
  for (const p of ['/w/.claude/worktrees/', '/w/.claude/worktrees/agent-a1']) {
    expect(normalize(p, '/w')).toBe(p.slice(3).replace(/\/$/, ''))
    expect(worktreeOf(p, '/w')).toBeNull()
  }
  expect(normalize('/x/.claude/worktrees/agent-a1/src/a.ts', '/w')).toBe('/x/.claude/worktrees/agent-a1/src/a.ts')
  expect(worktreeOf('/x/.claude/worktrees/agent-a1/src/a.ts', '/w')).toBeNull()
  expect(normalize('src/.claude/worktrees/agent-a1/a.ts', '/w')).toBe('src/.claude/worktrees/agent-a1/a.ts')
})

test('F15-R9 a plain path in the cwd has no worktree', () => {
  expect(worktreeOf('/w/src/a.ts', '/w')).toBeNull()
})

test('F15-R9 / NFR-C4 a Windows path under the worktree folder gives the same node and name (DERIVED: no Windows recording)', () => {
  expect(normalize('C:\\w\\.claude\\worktrees\\agent-a1\\src\\a.ts', 'C:\\w')).toBe('src/a.ts')
  expect(worktreeOf('C:\\w\\.claude\\worktrees\\agent-a1\\src\\a.ts', 'C:\\w')).toBe('agent-a1')
})
