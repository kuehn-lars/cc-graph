// Pure: F06. The imports of a text Claude's own tool result carried, one entry per language (F06 Implementation decisions).
type Language = {
  name: string
  extensions: string[]
  /** Every module specifier the text names, in order, bare ones included. */
  specifiers: (text: string) => string[]
  /** Ordered candidate paths for one specifier, relative to `workingDir` like the importer; none for a specifier the language does not link. */
  candidatesFor: (specifier: string, importer: string, workingDir: string) => string[]
}

const TS_FAMILY = ['.ts', '.tsx', '.mts', '.cts']
const JS_FAMILY = ['.js', '.jsx', '.mjs', '.cjs']
const extOf = (path: string) => /\.[^./]+$/.exec(path)?.[0] ?? ''

// Left to right, so a comment or string that starts earlier swallows what looks like an import inside it.
// ponytail: a regex literal or a `${}` holding a quote can still confuse this; a real tokenizer if a recording shows it.
const TS_TOKENS = new RegExp([
  String.raw`\/\/[^\n]*|\/\*[\s\S]*?\*\/`,
  String.raw`\b(?:import|export)\b[^'"` + '`' + String.raw`;=()]*?\bfrom\s*(['"])(.+?)\1`,
  String.raw`\bimport\s*(['"])(.+?)\3`,
  String.raw`(?<![.\w$])(?:require|import)\s*\(\s*(['"])(.+?)\5\s*\)`,
  String.raw`'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|` + '`(?:\\\\.|[^`\\\\])*`',
].join('|'), 'g')

const typescript: Language = {
  name: 'TypeScript',
  extensions: [...TS_FAMILY, ...JS_FAMILY],
  specifiers: text => [...text.matchAll(TS_TOKENS)].flatMap(m => m[2] ?? m[4] ?? m[6] ?? []),
  candidatesFor(spec, importer, _workingDir) {
    if (!/^\.\.?(\/|$)/.test(spec)) return [] // F06-R5: packages, `node:`, aliases
    const path = join(dirOf(importer), spec)
    if (path === null) return []
    const own = TS_FAMILY.includes(extOf(importer)) ? TS_FAMILY : JS_FAMILY
    const exts = [...own, ...(own === TS_FAMILY ? JS_FAMILY : TS_FAMILY)]
    const written = extOf(path)
    if (exts.includes(written)) {
      // `./util.js` in a TypeScript file names `util.ts`: its twin comes first.
      const twin = own === TS_FAMILY ? TS_FAMILY[JS_FAMILY.indexOf(written)] : undefined
      return twin ? [path.slice(0, -written.length) + twin, path] : [path]
    }
    const index = exts.map(x => `${path && path !== '/' ? path + '/' : path}index${x}`)
    return /(^|\/)\.\.?\/?$|\/$/.test(spec) ? index : [...exts.map(x => path + x), ...index] // `.`, `..` and `x/` name a folder
  },
}

const dirOf = (path: string) => path.slice(0, path.lastIndexOf('/') + 1)

/** `dir` (empty or ending in `/`) plus a relative `spec`, `.` and `..` resolved; null when it climbs out of a relative `dir`. */
function join(dir: string, spec: string): string | null {
  const root = dir.startsWith('/') ? '/' : ''
  const out: string[] = []
  for (const s of (dir + spec).split('/')) {
    if (s === '..') { if (!out.pop() && !root) return null } else if (s !== '' && s !== '.') out.push(s)
  }
  return root + out.join('/')
}

const languages: Language[] = [typescript]
const MAX_CHARS = 200_000 // F06-R9

const languageOf = (path: string) => languages.find(l => l.extensions.includes(extOf(path)))

/** F06-R2, R11: the specifiers the text of `path` names, none for a file of no known language. */
export const importsIn = (text: string, path: string): string[] =>
  text.length > MAX_CHARS ? [] : languageOf(path)?.specifiers(text) ?? []

/** F06-R3, R5: ordered candidate paths for one specifier of `importer`. */
export const candidatesFor = (specifier: string, importer: string, workingDir: string): string[] =>
  languageOf(importer)?.candidatesFor(specifier, importer, workingDir) ?? []

/** The candidate lists of every linkable import in `text`, one list per specifier. */
export const importCandidates = (text: string, importer: string, workingDir: string): string[][] =>
  importsIn(text, importer).map(s => candidatesFor(s, importer, workingDir)).filter(c => c.length > 0)
