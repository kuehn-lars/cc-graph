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

// NFR-C4 / I4: one file, as each platform spells it, is one node. The macOS and Linux paths follow the recorded
// sessions' shape; the Windows ones are DERIVED (no Windows recording).
const platforms = [
  { name: 'macOS', cwd: '/Users/me/app', same: ['/Users/me/app/src/a.ts', '/Users/me/app/./src/../src/a.ts', 'src/a.ts'], outside: ['/Users/me/other/b.ts', '/Users/me/other/b.ts'] },
  { name: 'Linux', cwd: '/home/me/app/', same: ['/home/me/app/src/a.ts', '/home/me/app//src/a.ts', './src/a.ts'], outside: ['/etc/hosts', '/etc/hosts'] },
  { name: 'Windows', cwd: 'C:\\Users\\me\\app', same: ['C:\\Users\\me\\app\\src\\a.ts', 'c:/Users/me/app/src/a.ts', 'C:\\Users\\me\\app\\src\\..\\src\\a.ts', 'src\\a.ts'], outside: ['D:\\other\\b.ts', 'd:/other/b.ts'] },
]

for (const p of platforms) {
  test(`NFR-C4 on ${p.name} every spelling of a file in the cwd is src/a.ts, and a file outside stays absolute with / separators`, () => {
    for (const path of p.same) expect(normalize(path, p.cwd)).toBe('src/a.ts')
    expect(normalize(p.outside[0]!, p.cwd)).toBe(p.outside[1])
  })
}
