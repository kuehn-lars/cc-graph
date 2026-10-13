import type { ImportTarget } from '../model/imports'
import { isAbs, normalize } from './path'

// Pure: F06. The imports of a text Claude's own tool result carried, one entry per language (F06 Implementation decisions).
type Language = {
  extensions: string[]
  /** Every module specifier the text names, in order, bare ones included. */
  specifiers: (text: string) => string[]
  /** Ordered candidate paths for one specifier, as node paths (I4); none for a specifier the language does not link. */
  candidatesFor: (specifier: string, importer: string, workingDir: string) => string[]
  /** True for a specifier that may only link to a node that already exists (F06-R3, R4). */
  existingOnly?: (specifier: string) => boolean
}

const TS_FAMILY = ['.ts', '.tsx', '.mts', '.cts']
const JS_FAMILY = ['.js', '.jsx', '.mjs', '.cjs']
const CODE = [...TS_FAMILY, ...JS_FAMILY]
// `./util.js` in a TypeScript file names `util.ts` or `util.tsx`, as TypeScript resolves it.
const TWINS: Record<string, string[]> = { '.js': ['.ts', '.tsx'], '.jsx': ['.tsx'], '.mjs': ['.mts'], '.cjs': ['.cts'] }
const extOf = (path: string) => /\.[^./]+$/.exec(path)?.[0] ?? ''
const dirOf = (path: string) => path.slice(0, path.lastIndexOf('/') + 1)

/** `rel` against the importer's folder, as a node path (I4): relative inside the working directory, absolute outside. */
const near = (importer: string, rel: string, workingDir: string) =>
  normalize(`${isAbs(importer) ? '' : workingDir + '/'}${dirOf(importer)}${rel}`, workingDir)

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
  extensions: CODE,
  specifiers: text => [...text.matchAll(TS_TOKENS)].flatMap(m => m[2] ?? m[4] ?? m[6] ?? []),
  candidatesFor(spec, importer, workingDir) {
    if (!/^\.\.?(\/|$)/.test(spec)) return [] // F06-R5: packages, `node:`, aliases
    const at = (rel: string) => near(importer, rel, workingDir)
    const ts = TS_FAMILY.includes(extOf(importer))
    const exts = ts ? CODE : [...JS_FAMILY, ...TS_FAMILY]
    const written = extOf(spec)
    if (CODE.includes(written)) return [...(ts ? TWINS[written] ?? [] : []).map(t => at(spec.slice(0, -written.length) + t)), at(spec)]
    const index = exts.map(x => at(`${spec}/index${x}`))
    return /(^|\/)\.\.?\/?$|\/$/.test(spec) ? index : [...exts.map(x => at(spec + x)), ...index] // `.`, `..` and `x/` name a folder
  },
  // `./styles.css` is no module; `./user.service` may be `user.service.ts`. Without the disk, only an existing node tells them apart.
  existingOnly: spec => extOf(spec) !== '' && !CODE.includes(extOf(spec)),
}

// ponytail: a statement after `;` or `:` (`if TYPE_CHECKING: import x`), a line continuation (`\`) or a `)` inside a string in a parenthesised list can still confuse this; a real tokenizer if a recording shows it.
// Left to right like TS_TOKENS; statements start a line. Groups: 1 `from` module, 2|3 its names, 4 `import` list.
const PY_TOKENS = new RegExp([
  String.raw`#[^\n]*`,
  String.raw`"""[\s\S]*?"""|'''[\s\S]*?'''`,
  String.raw`"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'`,
  String.raw`^[ \t]*from[ \t]+(\.*[A-Za-z_][\w.]*|\.+)[ \t]+import[ \t]*(?:\(([^)]*)\)|([^\n#;]*))`,
  String.raw`^[ \t]*import[ \t]+([^\n#;]*)`,
].join('|'), 'gm')

/** The first word of each comma-separated item (`a as b, c` gives `a`, `c`), comments dropped; `*` gives none. */
const pyNames = (list: string) =>
  list.replace(/#[^\n]*/g, '').split(',').flatMap(i => /^\s*([A-Za-z_][\w.]*)/.exec(i)?.[1] ?? [])

const python: Language = {
  extensions: ['.py'],
  specifiers: text => [...text.matchAll(PY_TOKENS)].flatMap(m =>
    m[1] === undefined ? pyNames(m[4] ?? '') : /^\.+$/.test(m[1]) ? pyNames(m[2] ?? m[3] ?? '').map(n => m[1] + n) : [m[1]]), // `from . import x` names the module `.x`
  candidatesFor(spec, importer, workingDir) {
    const dots = /^\.*/.exec(spec)![0].length
    const module = spec.slice(dots).replace(/\./g, '/')
    const base = dots ? near(importer, '../'.repeat(dots - 1) + module, workingDir) : module // absolute: already relative to the working directory
    return [base + '.py', base + '/__init__.py']
  },
  existingOnly: spec => !spec.startsWith('.'),
}

const languages: Language[] = [typescript, python]
const MAX_CHARS = 200_000 // F06-R9

const languageOf = (path: string) => languages.find(l => l.extensions.includes(extOf(path)))

/** F06-R2, R11: the specifiers the text of `path` names, none for a file of no known language. */
export const importsIn = (text: string, path: string): string[] =>
  text.length > MAX_CHARS ? [] : languageOf(path)?.specifiers(text) ?? []

/** F06-R3, R5: ordered candidate paths for one specifier of `importer`. */
export const candidatesFor = (specifier: string, importer: string, workingDir: string): string[] =>
  languageOf(importer)?.candidatesFor(specifier, importer, workingDir) ?? []

/** The candidates of every linkable import in `text`, one per specifier. */
export const importCandidates = (text: string, importer: string, workingDir: string): ImportTarget[] => {
  const lang = languageOf(importer)
  return !lang ? [] : importsIn(text, importer).flatMap(s => {
    const candidates = lang.candidatesFor(s, importer, workingDir)
    return candidates.length ? [{ candidates, ...(lang.existingOnly?.(s) && { existing: true }) }] : []
  })
}
