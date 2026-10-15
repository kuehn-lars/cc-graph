import cat from '../../fixtures/tool-results/bash-cat'
import persisted from '../../fixtures/tool-results/bash-persisted'
import sed from '../../fixtures/tool-results/bash-sed-n'
import { expect, test } from 'claude-code/testing'
import { cut } from '../../hooks/parse/shell'
import { shellReads } from '../../hooks/parse/shellReads'

// F07-R19: which segment reads which file. The results are the recorded ones (fixtures/tool-results); the commands
// they did not run are spellings of the same call, so only the command changes.
const reads = (command: string, f: { result: any; text?: string } = cat, cwd = '/w') =>
  shellReads(command, 'toolu_x', f.result, cwd, f.text, false).map(({ path, state, seen, tokens }) => ({ path, state, seen, tokens }))
const one = (path: string, state: 'read' | 'partial', seen: string, tokens: unknown = null) => [{ path, state, seen, tokens }]

test('F07-AC24 cat reads its file whole: "48 lines", tokens from the text, the call as readId', () => {
  const [r] = shellReads(cat.input.command, cat.tool_use_id, cat.result, '/w', cat.text, false)
  expect(r).toMatchObject({ type: 'fileRead', path: 'src/auth/login.ts', state: 'read', seen: '48 lines', readId: cat.tool_use_id, tokens: Math.ceil(cat.text.length / 4) })
})

test('F07-AC25 sed -n 1,5p is partial "lines 1 to 5"', () => {
  expect(reads(sed.input.command, sed)).toEqual(one('src/config.ts', 'partial', 'lines 1 to 5', Math.ceil(sed.text.length / 4)))
})

test('F07-AC25 a piped cat reads nothing, and cat reads again when only its stderr is redirected', () => {
  expect(reads('cat src/config.ts | grep port')).toEqual([])
  expect(reads('cat src/config.ts 2>&1')).toHaveLength(1)
  expect(reads('cat src/config.ts > /tmp/copy')).toEqual([])
})

test('F07-R19 head and tail say how many lines; any other form says the command', () => {
  expect(reads('head -n 5 src/a.ts')).toEqual(one('src/a.ts', 'partial', 'first 5 lines', expect.any(Number)))
  expect(reads('tail -n 3 src/a.ts')).toEqual(one('src/a.ts', 'partial', 'last 3 lines', expect.any(Number)))
  expect(reads('tail -n +3 src/a.ts')).toEqual(one('src/a.ts', 'partial', 'through `tail -n +3 src/a.ts`', expect.any(Number)))
  expect(reads("sed -n '/a/,/b/p' src/a.ts")).toEqual(one('src/a.ts', 'partial', "through `sed -n '/a/,/b/p' src/a.ts`", expect.any(Number)))
})

test('F07-AC32 head -50, bare head and tail -20 say their lines; sed -n with $ or one line says so too', () => {
  expect(reads('head -50 src/db/redis.ts')).toEqual(one('src/db/redis.ts', 'partial', 'first 50 lines', expect.any(Number)))
  expect(reads('head src/db/redis.ts')).toEqual(one('src/db/redis.ts', 'partial', 'first 10 lines', expect.any(Number)))
  expect(reads('tail -20 src/db/redis.ts')).toEqual(one('src/db/redis.ts', 'partial', 'last 20 lines', expect.any(Number)))
  expect(reads('tail src/db/redis.ts')).toEqual(one('src/db/redis.ts', 'partial', 'last 10 lines', expect.any(Number)))
  expect(reads("sed -n '10,$p' src/db/redis.ts")).toEqual(one('src/db/redis.ts', 'partial', 'lines 10 to the end', expect.any(Number)))
  expect(reads("sed -n '5p' src/db/redis.ts")).toEqual(one('src/db/redis.ts', 'partial', 'line 5', expect.any(Number)))
  expect(reads("sed -n -e '1,5p' src/db/redis.ts")).toEqual(one('src/db/redis.ts', 'partial', 'lines 1 to 5', expect.any(Number)))
})

test('F07-AC33 a print piped into head, tail or sed -n reads its file partial, with the filter\'s words and tokens from the output', () => {
  expect(reads('cat src/api/users.ts | head -10')).toEqual(one('src/api/users.ts', 'partial', 'first 10 lines', Math.ceil(cat.text.length / 4)))
  expect(reads("nl -ba src/config.ts | sed -n '1,40p'")).toEqual(one('src/config.ts', 'partial', 'lines 1 to 40', expect.any(Number)))
  expect(reads('cat -n src/a.ts | tail -n 5')).toEqual(one('src/a.ts', 'partial', 'last 5 lines', expect.any(Number)))
  expect(reads('cat src/a.ts src/b.ts | head -5').map(r => r.seen)).toEqual(['through `cat src/a.ts src/b.ts | head -5`', 'through `cat src/a.ts src/b.ts | head -5`'])
  for (const c of ['cat src/a.ts | grep x', 'cat src/a.ts | head -5 | grep x', 'cat src/a.ts | head -5 src/b.ts', 'cat src/a.ts | wc -l']) expect(reads(c).map(r => r.path)).toEqual(c.endsWith('src/b.ts') ? ['src/b.ts'] : [])
})

test('F07-R19 bat, nl and flags: the file is the operand, not the flag or its value', () => {
  expect(reads('bat src/a.ts')[0]).toMatchObject({ path: 'src/a.ts', state: 'read' })
  expect(reads('nl src/a.ts')[0]).toMatchObject({ path: 'src/a.ts', state: 'read' })
  expect(reads('cat -n src/a.ts')[0]).toMatchObject({ path: 'src/a.ts' })
  expect(reads('bat -r 1:5 src/a.ts').map(r => r.path)).toEqual(['src/a.ts'])
  expect(reads('head -n 5 src/a.ts').map(r => r.path)).toEqual(['src/a.ts'])
})

test('F07-R19 several files, or another segment: every file is read, seen says the command, tokens are null', () => {
  expect(reads('cat src/a.ts src/b.ts')).toEqual([
    ...one('src/a.ts', 'read', 'through `cat src/a.ts src/b.ts`'), ...one('src/b.ts', 'read', 'through `cat src/a.ts src/b.ts`'),
  ])
  expect(reads('rg x src && cat src/a.ts')).toEqual(one('src/a.ts', 'read', 'through `rg x src && cat src/a.ts`'))
})

test('F07-R19 paths resolve as in F02-R8: cd … && , absolute, and an unknown folder drops the read', () => {
  expect(reads('cd src && cat auth/login.ts').map(r => r.path)).toEqual(['src/auth/login.ts'])
  expect(reads('cat /w/src/a.ts').map(r => r.path)).toEqual(['src/a.ts'])
  expect(reads('cd $DIR && cat a.ts')).toEqual([])
})

test('F07-R19 a persisted result is partial "preview only"; an interrupted call reads nothing', () => {
  expect(shellReads('cat src/big.log', 'toolu_x', persisted.result, '/w', persisted.text, false)[0]).toMatchObject({ state: 'partial', seen: 'preview only' })
  expect(reads('cat src/a.ts', { result: { ...cat.result, interrupted: true }, text: cat.text })).toEqual([])
})

test('F07-R19 commands that print no file read nothing', () => {
  for (const c of ['ls src', 'cat', 'cat < src/a.ts', 'echo cat src/a.ts', 'sed -i s/a/b/ src/a.ts', 'git cat-file -p HEAD']) expect(reads(c)).toEqual([])
})

test('F07-R19 an operand the shell expands, and a lone &, name no file', () => {
  for (const c of ['cat "$F"', 'cat *.ts', 'cat $(ls)', 'cat ~/a.ts', 'cat `ls`', 'cat src/{a,b}.ts', 'cat src/a.ts &']) expect(reads(c).map(r => r.path)).toEqual(c === 'cat src/a.ts &' ? ['src/a.ts'] : [])
})

test('F07-AC38 a for loop reads each of its words through $f; the expanded words and other variables read nothing', () => {
  const command = 'for f in src/config.ts src/db/redis.ts; do echo "=== $f"; cat -n "$f"; done'
  expect(reads(command)).toEqual([...one('src/config.ts', 'read', `through \`${cut(command)}\``), ...one('src/db/redis.ts', 'read', `through \`${cut(command)}\``)])
  expect(reads('for f in src/*.ts; do cat "${f}"; done')).toEqual([])
  expect(reads('for f in a.ts; do cat "$g"; done')).toEqual([])
  expect(reads('for f in src/a.ts src/b.ts; do head -n 5 $f; done').map(r => r.seen)).toEqual(['first 5 lines', 'first 5 lines'])
})
