import { expect, test } from 'claude-code/testing'
import out from '../../fixtures/output/outputs'
import { shellChanges, statusOf } from '../../hooks/parse/status'

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
