// Pure: F07-R2, R3. The `git grep` that finds the files importing a changed one, and the confirmation of its hits.
import { candidatesFor, importsIn } from './imports'
import { normalize, worktreeOf } from './path'

export const PATHSPECS = ['*.ts', '*.tsx', '*.mts', '*.cts', '*.js', '*.jsx', '*.mjs', '*.cjs', '*.py']

const escape = (s: string) => s.replace(/[.^$*+?()[\]{}|\\]/g, '\\$&')

/**
 * An extended regular expression for the lines that import a file named like `path` without its extension: a JavaScript or TypeScript import line (F06-R2) whose quoted specifier ends in `/name`, or a Python `from`/`import` line that holds the name.
 * Deliberately loose: `importersOf` confirms each hit. ponytail: one line only (a `from` on its own line is missed), and an `index` file is found by neither form; widen if a recording shows it matters.
 */
export function importPattern(path: string): string {
  const name = escape(/([^/]+?)(\.[^./]+)?$/.exec(path)![1]!)
  return `(import|export|require|from)[^'"]*['"][^'"]*/${name}(\\.[A-Za-z]+)?['"]|^[[:space:]]*(from|import)([[:space:]].*)?[^[:alnum:]_]${name}([^[:alnum:]_]|$)`
}

/** The hits of `git grep -n`: `file:line:text`. */
export const grepHits = (stdout: string) =>
  stdout.split('\n').flatMap(l => {
    const m = /^(.+?):\d+:(.*)$/.exec(l)
    return m ? [{ file: m[1]!, text: m[2]! }] : []
  })

/**
 * F07-R3: the node paths (I4) of the hits whose import resolves to `changed`. `git grep` runs in `root`, so its paths are relative to it.
 * A file of an agent's worktree is skipped (F07-R15).
 */
export function importersOf(stdout: string, changed: string, root: string, cwd: string): string[] {
  const out: string[] = []
  for (const { file, text } of grepHits(stdout)) {
    const abs = `${root}/${file}`
    const path = normalize(abs, cwd)
    if (worktreeOf(abs, cwd) || path === changed || out.includes(path)) continue
    if (importsIn(text, path).some(s => candidatesFor(s, path, cwd).includes(changed))) out.push(path)
  }
  return out
}
