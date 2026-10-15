// Pure: what a shell command did to the working tree, from `git status --porcelain=v1 -z --untracked-files=all` before and after it (F07-R5, R6).
import { normalize } from './path'

/** `named`: the command named the path (F07-R17), so the change is Claude's own. `reverted`: a tracked change undone (F07-R6). `from`: the path a `mv` moved here (F07-R17). `history`: the `HEAD` diff names it (F07-R14). */
export type ShellChange = { path: string; change: 'created' | 'deleted' | 'blind' | 'edited' | 'reverted'; named?: boolean; from?: string; history?: boolean }

/** Each path the status names, with its two status letters (`" M"`, `"??"`); a rename or copy names its new path, and its old path as deleted (`" D"`). */
export function statusOf(stdout: string): Map<string, string> {
  const out = new Map<string, string>()
  const fields = stdout.split('\0')
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i]!
    if (f.length < 4) continue
    const code = f.slice(0, 2)
    out.set(f.slice(3), code)
    if (code[0] === 'R' || code[0] === 'C') {
      const old = fields[++i] // -z: the old path follows as a field of its own
      if (old && code[0] === 'R') out.set(old, ' D')
    }
  }
  return out
}

/** F07-R14: each path `git diff --name-status -z --no-renames` names, with its letter (`A`, `D`, `M`): fields come as letter, path, letter, path. */
export function nameStatusOf(stdout: string): Map<string, string> {
  const f = stdout.split('\0')
  const out = new Map<string, string>()
  for (let i = 0; i + 1 < f.length; i += 2) out.set(f[i + 1]!, f[i]!)
  return out
}

// F07-R15: an agent's worktree is not a file of the project. Checked on git's own path: normalize would map a file inside it onto the repository's.
const worktree = (p: string) => /(^|\/)\.claude\/worktrees\//.test(p)

/**
 * F07-R6: the paths a command changed, relative to `cwd` (I4): new and untracked, or the new path of a rename, `created`; deleted, or an untracked path gone, `deleted`; any other path new to the status or with other letters, `blind`.
 * F07-R17: a change that would be `blind`, to a path `named` says the command named, is `edited`.
 * A path that left the status otherwise (a commit, a `git stash`) changed nothing Claude needs to see.
 * F07-R6: with `reverts` (`HEAD` stayed, and no `git stash`), a path the baseline holds with letters other than `??` that the status no longer names was reverted.
 * F07-R14: `diff`, when `HEAD` moved, adds what a commit, merge or checkout did: `D` deleted (unless the baseline holds it as deleted), `A` created, any other letter blind; those two only for a path the baseline does not hold. An untracked path the diff adds was committed. `'first'`: the baseline had no `HEAD`, so there is no diff and every untracked path that left the status was committed.
 */
export function shellChanges(before: Map<string, string>, after: Map<string, string>, root: string, cwd: string, diff: Map<string, string> | 'first' = new Map(), named: (path: string) => boolean = () => false, reverts = false): ShellChange[] {
  const at = (p: string) => normalize(`${root}/${p}`, cwd)
  const out: ShellChange[] = []
  const other = (p: string) => (named(p) ? 'edited' : 'blind')
  const push = (path: string, change: ShellChange['change'], history = false) =>
    out.push({ path, change, ...(named(path) && (change === 'created' || change === 'edited') && { named: true }), ...(history && { history }) })
  for (const [p, code] of after) {
    if (before.get(p) === code || worktree(p)) continue
    push(at(p), code.includes('D') ? 'deleted' : code === '??' || code[0] === 'R' || code[0] === 'A' ? 'created' : other(at(p)))
  }
  for (const [p, code] of before) {
    if (worktree(p) || after.has(p)) continue
    if (code === '??' ? diff !== 'first' && !diff.has(p) : reverts) push(at(p), code === '??' ? 'deleted' : 'reverted')
  }
  if (diff !== 'first') for (const [p, letter] of diff) {
    if (worktree(p)) continue
    const was = before.get(p)
    if (letter === 'D' ? was?.includes('D') : was !== undefined) continue
    if (after.has(p)) continue // the status named it (R6)
    push(at(p), letter === 'D' ? 'deleted' : letter === 'A' ? 'created' : other(at(p)), true)
  }
  return out
}
