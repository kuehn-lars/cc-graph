import { expect, test } from 'claude-code/testing'
import { candidatesFor, importsIn } from '../../hooks/parse/imports'

// F06 ticket 02: the TypeScript entry (JavaScript files included). Snippets are typed by hand: they are source text, not tool output.
const forms: [name: string, text: string, want: string[]][] = [
  ['import … from', "import { a } from './a'", ['./a']],
  ['default and named', "import d, { a as b } from './a'", ['./a']],
  ['namespace', "import * as ns from './a'", ['./a']],
  ['type import', "import type { T } from './t'", ['./t']],
  ['multi-line list', "import {\n  a,\n  b,\n} from \"./multi\"", ['./multi']],
  ['side effect', "import './setup'", ['./setup']],
  ['export … from', "export { a } from './a'\nexport * from './b'\nexport * as c from './c'", ['./a', './b', './c']],
  ['require', "const x = require('./x')", ['./x']],
  ['dynamic import', "const m = await import('./m')", ['./m']],
  ['bare specifiers are listed', "import React from 'react'\nimport fs from 'node:fs'\nimport x from '@/lib/x'", ['react', 'node:fs', '@/lib/x']],
  ['line comment', "// import { a } from './a'\nimport { b } from './b'", ['./b']],
  ['block comment', "/* import './a'\n import { x } from './x' */\nimport './b'", ['./b']],
  ['string', "const s = \"import { a } from './a'\"\nconst t = 'require(\"./r\")'", []],
  ['template literal', 'const s = `import "./a"`', []],
  ['member named require', "loader.require('./a')", []],
  ['export without from', "export const a = 1\nexport { a }\nconst from = 'x'", []],
]
for (const [name, text, want] of forms) {
  test(`F06-R2 TypeScript importsIn: ${name}`, () => expect(importsIn(text, 'src/a.ts')).toEqual(want))
}

test('F06-R2 every TypeScript and JavaScript extension picks the entry; other extensions pick none (F06-R11)', () => {
  const text = "import './a'"
  for (const ext of ['ts', 'tsx', 'mts', 'cts', 'js', 'jsx', 'mjs', 'cjs']) expect(importsIn(text, `x.${ext}`)).toEqual(['./a'])
  for (const ext of ['md', 'json', 'go', '']) expect(importsIn(text, `x.${ext}`)).toEqual([])
})

const ts = (spec: string, importer = 'src/auth/login.ts') => candidatesFor(spec, importer, '/w')

test('F06-R3 an extensionless specifier tries the importer family, then the other, then /index', () => {
  expect(ts('./password')).toEqual([
    'src/auth/password.ts', 'src/auth/password.tsx', 'src/auth/password.mts', 'src/auth/password.cts',
    'src/auth/password.js', 'src/auth/password.jsx', 'src/auth/password.mjs', 'src/auth/password.cjs',
    'src/auth/password/index.ts', 'src/auth/password/index.tsx', 'src/auth/password/index.mts', 'src/auth/password/index.cts',
    'src/auth/password/index.js', 'src/auth/password/index.jsx', 'src/auth/password/index.mjs', 'src/auth/password/index.cjs',
  ])
})

test('F06-R3 a JavaScript importer tries the JavaScript family first', () => {
  const c = ts('./util', 'src/a.js')
  expect(c.slice(0, 5)).toEqual(['src/util.js', 'src/util.jsx', 'src/util.mjs', 'src/util.cjs', 'src/util.ts'])
})

test('F06-R3 ../ climbs and . or .. name the folder index', () => {
  expect(ts('../middleware/rateLimit')[0]).toBe('src/middleware/rateLimit.ts')
  expect(ts('..', 'src/auth/login.ts')[0]).toBe('src/index.ts')
  expect(ts('.', 'src/auth/login.ts')[0]).toBe('src/auth/index.ts')
})

test('F06-R3 a TypeScript importer\'s .js specifier tries the matching TypeScript file before the path as written (F06-AC7)', () => {
  expect(ts('./util.js', 'src/a.ts')).toEqual(['src/util.ts', 'src/util.js'])
  expect(ts('./view.jsx', 'src/a.tsx')).toEqual(['src/view.tsx', 'src/view.jsx'])
  expect(ts('./m.mjs', 'src/a.mts')).toEqual(['src/m.mts', 'src/m.mjs'])
  expect(ts('./c.cjs', 'src/a.cts')).toEqual(['src/c.cts', 'src/c.cjs'])
})

test('F06-R3 a specifier already ending in a known extension is tried as written, and a JavaScript importer does not swap', () => {
  expect(ts('./util.ts', 'src/a.ts')).toEqual(['src/util.ts'])
  expect(ts('./util.js', 'src/a.js')).toEqual(['src/util.js'])
})

test('F06-AC2 import React from \'react\' has no candidates: no edge, no node (F06-R5)', () => {
  for (const s of ['react', 'rate-limiter-flexible', 'node:fs', 'fs', '@scope/pkg']) expect(ts(s)).toEqual([])
})

test('F06-AC9 import x from \'@/lib/x\' has no candidates: no edge, no node (F06-R5)', () => {
  for (const s of ['@/lib/x', '~/x', '#internal']) expect(ts(s)).toEqual([])
})

test('F06-R10 a file importing itself resolves to its own path first, so the reducer can drop it', () => {
  expect(ts('./login')[0]).toBe('src/auth/login.ts')
  expect(ts('./login.ts')).toEqual(['src/auth/login.ts'])
})

test('F06-R3 a specifier that climbs out of the working folder has no candidates', () => {
  expect(ts('../../x', 'src/a.ts')).toEqual([])
})

test('F06-R11 an importer of no known language has no candidates', () => {
  expect(candidatesFor('./a', 'docs/usage.md', '/w')).toEqual([])
})
