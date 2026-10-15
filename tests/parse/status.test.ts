import { expect, test } from 'claude-code/testing'
import out from '../../fixtures/output/outputs'
import { nameStatusOf, shellChanges, statusOf } from '../../hooks/parse/status'

const clean = statusOf(out['git-status-clean'].stdout)
const installed = statusOf(out['git-status-after-npm-install'].stdout) // npm install, and a file Claude wrote
const variety = statusOf(out['git-status-variety'].stdout) // then a staged rename, an rm and a path with a space

test('F07-R5 statusOf: each path with its letters; a rename names its new path and its old one as deleted', () => {
  expect([...clean]).toEqual([])
  expect(Object.fromEntries(variety)).toEqual({
    'package-lock.json': ' M', 'package.json': ' M', 'src/db/store.ts': 'R ', 'src/db/redis.ts': ' D',
    'test/helpers.ts': ' D', 'notes with space.md': '??', 'src/middleware/rateLimit.ts': '??',
  })
})

test('F07-AC2 / AC12 shellChanges: npm install changed two tracked files; an untracked file is created', () => {
  expect(shellChanges(clean, installed, '/r', '/r')).toEqual([
    { path: 'package-lock.json', change: 'blind' }, { path: 'package.json', change: 'blind' }, { path: 'src/middleware/rateLimit.ts', change: 'created' },
  ])
})

test('F07-AC13 shellChanges: an rm and a rename\'s old path are deleted, its new path created; what did not change is left out', () => {
  expect(shellChanges(installed, variety, '/r', '/r')).toEqual([
    { path: 'src/db/store.ts', change: 'created' }, { path: 'src/db/redis.ts', change: 'deleted' },
    { path: 'test/helpers.ts', change: 'deleted' }, { path: 'notes with space.md', change: 'created' },
  ])
})

test('F07-AC14 shellChanges: an untracked file gone is deleted; a path that left the status otherwise is not', () => {
  expect(shellChanges(variety, installed, '/r', '/r')).toEqual([{ path: 'notes with space.md', change: 'deleted' }])
})

test('F07-R6 shellChanges: paths are relative to the session\'s folder, which may be under the root', () => {
  expect(shellChanges(clean, installed, '/r', '/r/src')).toContainEqual({ path: 'middleware/rateLimit.ts', change: 'created' })
})

// F07-R14: `git diff --name-status -z --no-renames` between two commits, as captured.
const deleted = nameStatusOf(out['git-diff-commit-delete'].stdout)
const added = nameStatusOf(out['git-diff-merge-add'].stdout)
const modified = nameStatusOf(out['git-diff-commit-delete'].stdout.replace('D', 'M')) // derived: no capture produced an M

test('F07-R14 nameStatusOf: each path with its letter', () => {
  expect([...deleted]).toEqual([['test/helpers.ts', 'D']])
  expect([...added]).toEqual([['side.txt', 'A']])
  expect([...modified]).toEqual([['test/helpers.ts', 'M']])
  expect([...nameStatusOf('')]).toEqual([])
})

test('F07-AC17 / AC18 shellChanges: a diff D is deleted, A created, another letter blind; the status stays unchanged', () => {
  expect(shellChanges(clean, clean, '/r', '/r', deleted)).toEqual([{ path: 'test/helpers.ts', change: 'deleted' }])
  expect(shellChanges(clean, clean, '/r', '/r', added)).toEqual([{ path: 'side.txt', change: 'created' }])
  expect(shellChanges(clean, clean, '/r', '/r', modified)).toEqual([{ path: 'test/helpers.ts', change: 'blind' }])
})

test('F07-AC19 shellChanges: an untracked path of the baseline that the diff adds was committed, not deleted', () => {
  const before = statusOf('?? notes/b.md\0')
  expect(shellChanges(before, clean, '/r', '/r', nameStatusOf(out['git-diff-commit-untracked'].stdout))).toEqual([])
  expect(shellChanges(before, clean, '/r', '/r')).toEqual([{ path: 'notes/b.md', change: 'deleted' }])
})

test('F07-R14 shellChanges: the diff adds nothing for a path the status already named, or the baseline holds (an earlier deletion keeps its reason)', () => {
  const gone = statusOf(' D test/helpers.ts\0')
  expect(shellChanges(gone, clean, '/r', '/r', deleted)).toEqual([])
  expect(shellChanges(clean, gone, '/r', '/r', deleted)).toEqual([{ path: 'test/helpers.ts', change: 'deleted' }])
  expect(shellChanges(statusOf(' M side.txt\0'), clean, '/r', '/r', added)).toEqual([])
})
