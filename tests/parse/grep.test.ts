import { expect, test } from 'claude-code/testing'
import out from '../../fixtures/output/outputs'
import { grepHits, importPattern, importersOf } from '../../hooks/parse/grep'

const captured = out['git-grep-importers-login'].stdout // two importers of ../auth/login, captured in the sample app

test('F07-R2 importPattern: the file name without extension, its regular-expression characters escaped', () => {
  expect(importPattern('src/auth/login.ts')).toContain('/login(\\.[A-Za-z]+)?[\'"]')
  expect(importPattern('src/a.b+c(1).ts')).toContain('a\\.b\\+c\\(1\\)')
  expect(importPattern('lib/[id].tsx')).toContain('\\[id\\]')
})

test('F07-R2 grepHits: file, line number and text of each git grep -n line; a colon in the text stays in it', () => {
  expect(grepHits(captured)).toEqual([
    { file: 'src/api/users.ts', text: "import { bearerToken, currentUser, registerUser, userCount } from '../auth/login'" },
    { file: 'src/routes/index.ts', text: "import { bearerToken, currentUser, login, logout } from '../auth/login'" },
  ])
  expect(grepHits("a.ts:3:import x from './y' // a:b\n")).toEqual([{ file: 'a.ts', text: "import x from './y' // a:b" }])
  expect(grepHits('')).toEqual([])
})

test('F07-R3 importersOf: each hit that resolves to the changed path counts', () => {
  expect(importersOf(captured, 'src/auth/login.ts', '/r', '/r')).toEqual(['src/api/users.ts', 'src/routes/index.ts'])
})

test('F07-AC9 (derived) importersOf: ./login from src/admin resolves to src/admin/login.ts, not src/auth/login.ts', () => {
  expect(importersOf("src/admin/panel.ts:1:import { x } from './login'\n", 'src/auth/login.ts', '/r', '/r')).toEqual([])
})

test('F07-R3 (derived) importersOf: paths are relative to the session folder, which may be under the root; a worktree\'s hit counts for nobody', () => {
  const hits = "src/api/users.ts:2:import { a } from '../auth/login'\n.claude/worktrees/agent-1/src/api/users.ts:2:import { a } from '../auth/login'\n"
  expect(importersOf(hits, 'auth/login.ts', '/r', '/r/src')).toEqual(['api/users.ts'])
})

test('F07-R3 (derived) importersOf: a Python import is confirmed with the same rules', () => {
  expect(importersOf('pkg/b.py:1:from .a import x\n', 'pkg/a.py', '/r', '/r')).toEqual(['pkg/b.py'])
})

test('F07-AC28 (derived) importPattern: a changed index file is found by its folder\'s name; importersOf confirms `../auth` as src/auth/index.ts', () => {
  expect(importPattern('src/auth/index.ts')).toContain('/auth(/index)?(\\.[A-Za-z]+)?[\'"]')
  expect(importPattern('index.ts')).toContain('/index(\\.')
  expect(importersOf("src/routes/index.ts:1:import { login } from '../auth'\n", 'src/auth/index.ts', '/r', '/r')).toEqual(['src/routes/index.ts'])
  expect(importersOf("src/routes/x.ts:1:import { login } from '../auth/index'\n", 'src/auth/index.ts', '/r', '/r')).toEqual(['src/routes/x.ts'])
  expect(importersOf('pkg/b.py:1:from auth import x\n', 'auth/__init__.py', '/r', '/r')).toEqual(['pkg/b.py'])
})

test('F07-AC29 (derived) importersOf: the last line of a multi-line import, `} from \'…\'`, is confirmed', () => {
  expect(importersOf("src/api/users.ts:9:} from '../auth/login'\n", 'src/auth/login.ts', '/r', '/r')).toEqual(['src/api/users.ts'])
  expect(importersOf("src/api/users.ts:9:} from '../auth/other'\n", 'src/auth/login.ts', '/r', '/r')).toEqual([])
})
