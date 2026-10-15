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

test('F02-AC18 hitsIn: the folder headers of an ls run after the search are no hits', () => {
  const run = out['grep-rn-verify-then-ls']
  const hits = hitsIn(run.stdout, searchesIn(run.command)[0]!)
  expect(Object.keys(hits).sort()).toEqual(['src/auth/login.ts', 'src/auth/password.ts'])
})

test('F02-AC19 hitsIn: an error line of another segment, its path quoted, is no hit', () => {
  const run = out['eza-missing-then-rg-n-log']
  const hits = hitsIn(run.stdout, searchesIn(run.command)[0]!)
  expect(Object.keys(hits)).not.toContain('"src/middleware"')
  expect(Object.keys(hits).sort()).toEqual(['src/api/users.ts', 'src/auth/CLAUDE.md', 'src/auth/login.ts', 'src/config.ts', 'src/routes/index.ts'])
})

// DERIVED: the captured grep line with its text cut after `verify(password, user.passwordHash`; no capture holds a hit ending in a colon.
test('F02-R2 hitsIn: a hit whose text ends in a colon is still a hit; only a line that is its path and the colon is skipped', () => {
  const run = out['grep-rn-verify-then-ls']
  const line = run.stdout.split('\n').find(l => l.startsWith('src/auth/login.ts:'))!
  const hits = hitsIn(`${line.slice(0, line.indexOf('verifyPassword('))}case 'x':\nsrc/auth:\n`, searchesIn(run.command)[0]!)
  expect(Object.keys(hits)).toEqual(['src/auth/login.ts'])
})

test('F02-R9 hitsIn: at most 1,000 lines', () => {
  const stdout = Array.from({ length: 1200 }, (_, i) => `src/f${i % 2}.ts:${i}:x`).join('\n')
  const hits = hitsIn(stdout, search)
  expect(hits['src/f0.ts']!.hits + hits['src/f1.ts']!.hits).toBe(1000)
})

test('F02-R2 hitsIn: empty output has no hits', () => {
  expect(hitsIn('', search)).toEqual({})
})

// F02-R1 / F02-R3 (ticket 02): a search counts wherever it sits in the command. Separators split segments outside
// quotes; a search piped into from another segment with no path operand reads standard input and is no search.
const pipeline: [name: string, command: string, expected: ReturnType<typeof searchesIn>][] = [
  ['a pipe: the search is the first segment', out['rg-n-verify-src-head'].command, rg(['-n'], ['verify', 'src'])],
  ['&&: the search is after a chain', 'npm run lint && rg -n verify src | head -20', rg(['-n'], ['verify', 'src'])],
  ['||', 'false || rg -n verify src', rg(['-n'], ['verify', 'src'])],
  [';', 'cd src; rg -n verify .', [{ ...rg(['-n'], ['verify', '.'])[0]!, dir: null }]], // only `cd … &&` is known (F02-R8)
  ['a newline', 'cd src\nrg -n verify .', [{ ...rg(['-n'], ['verify', '.'])[0]!, dir: null }]],
  ['separators without spaces', 'ls&&rg -n a src||echo;rg -n b src', [...rg(['-n'], ['a', 'src']), ...rg(['-n'], ['b', 'src'])]],
  ['two searches in two segments', 'rg -n a src && grep -rn b lib', [...rg(['-n'], ['a', 'src']), { tool: 'grep', flags: ['-rn'], operands: ['b', 'lib'] }]],
  ['a separator in double quotes', 'rg -n "a|b" src', rg(['-n'], ['a|b', 'src'])],
  ['a separator in single quotes', "rg -n 'a && b; c' src", rg(['-n'], ['a && b; c', 'src'])],
  ['an escaped separator', 'rg -n a\\|b src', rg(['-n'], ['a|b', 'src'])],
  ['an escaped semicolon', 'rg -n a\\;b src', rg(['-n'], ['a;b', 'src'])],
  ['a quoted command holding a separator and a search', 'echo "x; rg -n a src"', []],
  ['standard input: the captured cat log.txt | rg -n error', out['cat-log-rg-n-error'].command, []],
  ['standard input: grep after a pipe, no path', 'cat log | grep -n error', []],
  ['standard input: git grep after a pipe, no path', 'echo x | git grep -n error', []],
  ['a pipe with a path operand reads the path', 'echo x | rg -n error src', rg(['-n'], ['error', 'src'])],
  ['a pipe with -e and a path operand', 'echo x | rg -n -e error src', rg(['-n', '-e'], ['error', 'src'])],
  ['a pipe with -e and no path operand', 'echo x | grep -n -e error', []],
  ['not piped into: the first of a pipeline reads its own paths', 'rg -n error | sort', rg(['-n'], ['error'])],
  ['not piped into: after && it reads no pipe', 'cd src && rg -n error', [{ ...rg(['-n'], ['error'])[0]!, dir: 'src' }]],
  ['a search in the middle of a pipeline, with a path', 'cat a | rg -n error src | head', rg(['-n'], ['error', 'src'])],
]

for (const [name, command, expected] of pipeline)
  test(`F02-R1 searchesIn: ${name}`, () => {
    expect(searchesIn(command)).toEqual(expected)
  })

// F02-R8 (ticket 04): the working directory of each search. `undefined`: the session's; a string: the literal path of
// the `cd … &&` before it (relative to the session's, or absolute); `null`: unknown, the search's hits are dropped.
const dirs: [name: string, command: string, expected: (string | null | undefined)[]][] = [
  ['no cd: the session\'s directory', 'rg -n verify auth', [undefined]],
  ['a relative cd', 'cd src && rg -n verify auth', ['src']],
  ['an absolute cd', 'cd /abs/src && rg -n verify auth', ['/abs/src']],
  ['a Windows drive cd', 'cd C:/w/src && rg -n verify auth', ['C:/w/src']],
  ['a quoted path with a space', 'cd "my dir" && rg -n verify auth', ['my dir']],
  ['two cds in a row', 'cd src && cd auth && rg -n verify .', ['src/auth']],
  ['a relative cd after an absolute one', 'cd /abs && cd src && rg -n verify .', ['/abs/src']],
  ['an absolute cd replaces the directory', 'cd src && cd /abs && rg -n verify .', ['/abs']],
  ['an absolute cd after an unknown one is known again', 'cd $DIR && cd /abs && rg -n verify .', ['/abs']],
  ['a relative cd after an unknown one stays unknown', 'cd $DIR && cd src && rg -n verify .', [null]],
  ['a search before the cd is in the session\'s directory', 'rg -n a . && cd src && rg -n b .', [undefined, 'src']],
  ['a variable', 'cd $DIR && rg -n verify auth', [null]],
  ['a variable in double quotes', 'cd "$DIR" && rg -n verify auth', [null]],
  ['a command substitution', 'cd `pwd` && rg -n verify auth', [null]],
  ['~', 'cd ~ && rg -n verify auth', [null]],
  ['a glob', 'cd s* && rg -n verify auth', [null]],
  ['cd -', 'cd - && rg -n verify auth', [null]],
  ['cd with no path', 'cd && rg -n verify auth', [null]],
  ['cd with a flag', 'cd -P src && rg -n verify auth', [null]],
  ['a subshell', '(cd src && rg -n verify auth)', [null]],
  ['a subshell before the search', '(cd src && make) && rg -n verify auth', [null]],
  ['cd joined by ;', 'cd src; rg -n verify auth', [null]],
  ['cd joined by ||', 'cd src || rg -n verify auth', [null]],
  ['cd piped', 'cd src | rg -n verify auth', [null]],
]

for (const [name, command, expected] of dirs)
  test(`F02-R8 searchesIn: dir of ${name}`, () => {
    expect(searchesIn(command).map(s => s.dir)).toEqual(expected)
  })

// F02-R2 / F02-R3: a flag's value and a redirection are no operand. The operands are the pattern, then the paths;
// a pattern given by -e or -f takes the first slot and every positional operand is a path.
const operands: [name: string, command: string, expected: string[]][] = [
  ['-t takes a value', 'rg -t ts verify src/a.ts', ['verify', 'src/a.ts']],
  ['-g takes a value', "rg -g '*.ts' verify src", ['verify', 'src']],
  ['-m takes a value', 'rg -m 5 verify', ['verify']],
  ['-A, -B and -C take a value', 'rg -A 1 -B 2 -C 3 verify src', ['verify', 'src']],
  ['a cluster ending in a value flag', 'rg -nA 2 verify src', ['verify', 'src']],
  ['an attached value', 'rg -tts -m5 -A2 verify src', ['verify', 'src']],
  ['-e is the pattern, so a positional operand is a path', 'rg -e a src', ['a', 'src']],
  ['two -e patterns and no path', 'rg -e a -e b', ['a']],
  ['-f is the pattern file', 'rg -f pats src', ['pats', 'src']],
  ['an attached -e', 'rg -eabc src', ['abc', 'src']],
  ['long flags with a separate value', 'rg --type ts --glob "*.ts" --max-count 5 --context 2 --after-context 1 --before-context 1 verify src', ['verify', 'src']],
  ['long flags with =', 'rg --type=ts --max-count=5 --regexp=abc src', ['abc', 'src']],
  ['--regexp and --file with a separate value', 'rg --regexp a --file f src', ['a', 'src']],
  ['2>&1', 'rg verify src/a.ts 2>&1', ['verify', 'src/a.ts']],
  ['2>/dev/null', 'rg verify src 2>/dev/null', ['verify', 'src']],
  ['>file', 'rg verify src >out.txt', ['verify', 'src']],
  ['> file', 'rg verify src > out.txt', ['verify', 'src']],
  ['&>file and >>file', 'rg verify src &>out.txt >>log', ['verify', 'src']],
  ['a quoted pattern that starts with > is an operand', "rg '>= 5' src", ['>= 5', 'src']],
  ['-- ends the flags', 'rg -n verify -- -t src', ['verify', '-t', 'src']],
]

for (const [name, command, expected] of operands)
  test(`F02-R2 searchesIn: operands of ${name}`, () => {
    expect(searchesIn(command)[0]!.operands).toEqual(expected)
  })

test('F02-R3 searchesIn: a value flag or -e pattern with no path reads standard input', () => {
  expect(searchesIn('cat f | rg -m 5 verify')).toEqual([])
  expect(searchesIn('cat f | rg -e a -e b')).toEqual([])
  expect(searchesIn('cat f | rg verify 2>&1')).toEqual([])
})

test('F02-R3 searchesIn: a value flag or redirection with a path still reads the path', () => {
  expect(searchesIn('cat f | rg -t ts verify src/a.ts')).toHaveLength(1)
  expect(searchesIn('cat f | rg -e a src 2>&1')).toHaveLength(1)
})
