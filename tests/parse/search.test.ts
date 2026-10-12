import { expect, test } from 'claude-code/testing'
import out from '../../fixtures/output/outputs'
import { hitsIn, searchesIn } from '../../hooks/parse/search'

// F02-R1: which commands hold a search. Commands are those captured in fixtures/output (their `command`), plus
// spellings the captures do not cover (quotes, assignments); tool output is never typed here.
const rg = (flags: string[], operands: string[]) => [{ tool: 'rg', flags, operands }]

const commands: [name: string, command: string, expected: ReturnType<typeof searchesIn>][] = [
  ['the reference session\'s quoted rg -n', out['rg-n-verify-src-auth'].command, rg(['-n'], ['verify', 'src/auth'])],
  ['rg with no flag', out['rg-verify-src'].command, rg([], ['verify', 'src'])],
  ['grep -rn', out['grep-rn-verify-src'].command, [{ tool: 'grep', flags: ['-rn'], operands: ['verify', 'src'] }]],
  ['git grep -n', out['git-grep-n-verify'].command, [{ tool: 'git grep', flags: ['-n'], operands: ['verify'] }]],
  ['a NAME=value prefix before git grep, flags with values, and --', out['git-grep-importers-login'].command,
    [{ tool: 'git grep', flags: ['-n', '-I', '--untracked', '-E', '-e'], operands: [
      '(import|export|require|from)[^\'"]*[\'"][^\'"]*/login[\'"]', '*.ts', '*.tsx', '*.mts', '*.cts', '*.js', '*.jsx', '*.mjs', '*.cjs', '*.py'] }]],
  ['egrep and fgrep', 'egrep -n a src', [{ tool: 'egrep', flags: ['-n'], operands: ['a', 'src'] }]],
  ['fgrep', 'fgrep -n a src', [{ tool: 'fgrep', flags: ['-n'], operands: ['a', 'src'] }]],
  ['assignments skipped, quoted values with a space', 'A=1 B="x y" rg -n verify', rg(['-n'], ['verify'])],
  ['single quotes keep a space in a pattern', "rg 'a b' src", rg([], ['a b', 'src'])],
  ['a backslash keeps a space in a word', 'rg a\\ b src', rg([], ['a b', 'src'])],
  ['nothing is expanded', 'rg $HOME ~/x', rg([], ['$HOME', '~/x'])],
  ['npm test', 'npm test', []],
  ['ls', 'ls src', []],
  ['a search tool named only as an argument', 'cat rg', []],
  ['git without grep', out['git-status-clean'].command, []],
  ['git log --grep is not git grep', 'git log --grep verify', []],
  ['grep inside a quoted word', 'echo "rg -n x"', []],
  ['a pipeline (ticket 02 splits segments)', out['rg-n-verify-src-head'].command, []],
]

for (const [name, command, expected] of commands)
  test(`F02-R1 searchesIn: ${name}`, () => {
    expect(searchesIn(command)).toEqual(expected)
  })

// F02-R2: the `path:line:text` and `path:text` forms. Character counts are of the hit lines without their newline.
const search = searchesIn('rg -n verify src')[0]!
const auth = { 'src/auth/password.ts': { hits: 2, chars: 221 }, 'src/auth/login.ts': { hits: 2, chars: 159 } }

test('F02-R2 hitsIn: rg -n output', () => {
  expect(hitsIn(out['rg-n-verify-src-auth'].stdout, search)).toEqual(auth)
})

test('F02-R2 hitsIn: grep -rn output', () => {
  expect(hitsIn(out['grep-rn-verify-src'].stdout, search)).toEqual(auth)
})

test('F02-R2 hitsIn: git grep -n output', () => {
  expect(hitsIn(out['git-grep-n-verify'].stdout, search)).toEqual(auth)
})

test('F02-R2 hitsIn: rg without -n has the path:text form too', () => {
  // The lines are shorter by their ":21" and so on.
  expect(hitsIn(out['rg-verify-src'].stdout, search)).toEqual({ 'src/auth/password.ts': { hits: 2, chars: 215 }, 'src/auth/login.ts': { hits: 2, chars: 154 } })
})

test('F02-R2 hitsIn: lines of a pipeline output (head) are hits', () => {
  expect(hitsIn(out['rg-n-verify-src-head'].stdout, search)).toEqual(auth)
})

test('F02-R2 hitsIn: context lines (-A1) are not hits and a hit line is not lost', () => {
  const hits = hitsIn(out['rg-n-A1-verify-src-auth'].stdout, search)
  expect(Object.values(hits).map(h => h.hits)).toEqual([2, 2])
})

test('F02-R2 hitsIn: lines with no path, or a path with a space, or no / and no ., are skipped', () => {
  const stdout = ['  indented text: no path', 'two words/x.ts: no', 'word:12:no slash or dot', 'dir/file.ts:3:ok', ''].join('\n')
  expect(hitsIn(stdout, search)).toEqual({ 'dir/file.ts': { hits: 1, chars: 'dir/file.ts:3:ok'.length } })
})

test('F02-R9 hitsIn: at most 1,000 lines', () => {
  const stdout = Array.from({ length: 1200 }, (_, i) => `src/f${i % 2}.ts:${i}:x`).join('\n')
  const hits = hitsIn(stdout, search)
  expect(hits['src/f0.ts']!.hits + hits['src/f1.ts']!.hits).toBe(1000)
})

test('F02-R2 hitsIn: empty output has no hits', () => {
  expect(hitsIn('', search)).toEqual({})
})
