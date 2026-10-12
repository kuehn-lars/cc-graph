import { expect, test } from 'claude-code/testing'
import out from '../../fixtures/output/outputs'
import { hitsIn, searchesIn } from '../../hooks/parse/search'

// F02-R2 (the other output forms) and F02-R3 (the flags that print no hits), over the captures in fixtures/output.
const hitsOf = (name: keyof typeof out) => hitsIn(out[name].stdout, searchesIn(out[name].command)[0]!)
const lines = (name: keyof typeof out) => out[name].stdout.split('\n').filter(Boolean).sort() // rg prints in no fixed order
const keys = (hits: object) => Object.keys(hits).sort()
const sum = (name: keyof typeof out) => lines(name).reduce((n, l) => n + l.length, 0)

test('F02-R2 hitsIn: rg -l has a bare path per line, one hit each', () => {
  const hits = hitsOf('rg-l-verify')
  expect(keys(hits)).toEqual(lines('rg-l-verify'))
  expect(Object.values(hits).map(h => h.hits)).toEqual([1, 1])
})

test('F02-R2 hitsIn: grep -rl has a bare path per line, one hit each', () => {
  expect(keys(hitsOf('grep-rl-verify-src'))).toEqual(lines('grep-rl-verify-src'))
})

test('F02-R2 hitsIn: -l counts the characters of the path line', () => {
  expect(hitsOf('rg-l-verify')['src/auth/login.ts']).toEqual({ hits: 1, chars: 'src/auth/login.ts'.length })
})

test('F02-R2 hitsIn: one path operand and lines with no path are all hits in it', () => {
  expect(hitsOf('rg-verify-login')).toEqual({ 'src/auth/login.ts': { hits: 2, chars: sum('rg-verify-login') } })
})

test('F02-R2 hitsIn: -n with one file operand, lines start with the line number', () => {
  const stdout = lines('rg-verify-login').map((l, i) => `${i + 2}:${l}`).join('\n')
  const chars = stdout.length - 1 // minus the newline between the two lines
  expect(hitsIn(stdout, searchesIn('rg -n verify src/auth/login.ts')[0]!)).toEqual({ 'src/auth/login.ts': { hits: 2, chars } })
})

test('F02-R2 hitsIn: two operands besides the pattern, and lines with no path, are no hits', () => {
  expect(hitsIn(out['rg-verify-login'].stdout, searchesIn('rg verify src/auth/login.ts src/db')[0]!)).toEqual({})
})

test('F02-R2 hitsIn: a single operand does not turn path lines into hits in the operand', () => {
  expect(keys(hitsOf('rg-verify-src'))).toEqual(['src/auth/login.ts', 'src/auth/password.ts'])
})

test('F02-R2 hitsIn: -A1 context lines (path-line-text) are no hits', () => {
  expect(Object.values(hitsOf('rg-n-A1-verify-src-auth')).map(h => h.hits)).toEqual([2, 2])
})

// F02-R3: flags that print no hits.
for (const [flag, name] of [['--files', 'rg-files'], ['-c', 'rg-c-verify-src']] as const)
  test(`F02-R3 hitsIn: ${flag} output adds nothing (captured)`, () => {
    expect(hitsOf(name)).toEqual({})
  })

for (const flag of ['--files', '-c', '--count', '--json', '-q', '--quiet', '-L', '-rc', '-nc', '-cn', '-rL'])
  test(`F02-R3 hitsIn: ${flag} adds nothing, even with path-like lines`, () => {
    expect(hitsIn(out['rg-n-verify-src-auth'].stdout, searchesIn(`rg ${flag} verify src/auth`)[0]!)).toEqual({})
  })

test('F02-R3 hitsIn: -n alone, and a value flag whose letters spell a mode, do not turn the mode on', () => {
  const stdout = out['rg-n-verify-src-auth'].stdout
  for (const cmd of ['rg -n verify src/auth', 'rg -tlua verify src/auth', 'grep -rn -m1 verify src/auth'])
    expect(keys(hitsIn(stdout, searchesIn(cmd)[0]!))).toEqual(['src/auth/login.ts', 'src/auth/password.ts'])
})

test('F02-R2 hitsIn: -l as --files-with-matches, and in a cluster', () => {
  for (const cmd of ['grep -rl verify src', 'rg --files-with-matches verify'])
    expect(keys(hitsIn(out['rg-l-verify'].stdout, searchesIn(cmd)[0]!))).toEqual(lines('rg-l-verify'))
})

// DERIVED: rg --count-matches prints path:N like -c; no capture holds it.
test('F02-R3 hitsIn: --count-matches (path:N lines) adds nothing', () => {
  expect(hitsIn('src/a.ts:3\n', searchesIn('rg --count-matches verify src')[0]!)).toEqual({})
})

// DERIVED: with -t, the single path operand is still the second operand; stdout has no path.
test('F02-R2 hitsIn: rg -t ts verify src/a.ts 2>&1 gives the lines to src/a.ts', () => {
  expect(hitsIn('const x = verify(a)\n', searchesIn('rg -t ts verify src/a.ts 2>&1')[0]!)).toEqual({ 'src/a.ts': { hits: 1, chars: 'const x = verify(a)'.length } })
})
