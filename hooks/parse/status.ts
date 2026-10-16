// Pure: what a shell command did to the working tree, from `git status --porcelain=v1 -z --untracked-files=all` before and after it (F07-R5, R6).
import { normalize } from './path'

/** `named`: the command named the path (F07-R17), so the change is Claude's own. `reverted`: a tracked change undone (F07-R6). `from`: the path a `mv` moved here (F07-R17). `history`: the `HEAD` diff names it (F07-R14). `count`: git's path for it, when its lines can be counted (F07-R23): untracked after the command, or a tracked edit the baseline did not hold. `added`, `removed`: the lines counted. */
export type ShellChange = { path: string; change: 'created' | 'deleted' | 'blind' | 'edited' | 'reverted'; named?: boolean; from?: string; history?: boolean; count?: { path: string; untracked: boolean }; added?: number; removed?: number }

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
 * F07-R6: with `reverts` (no `git stash`, and `diff` known when `HEAD` moved), a path the baseline holds with letters other than `??` that the status no longer names, and the diff does not name (a commit would), was reverted.
 * F07-R22: a path in `written` that the status holds with the same letters before and after (a second edit of a changed file) is `edited`.
 * F07-R14: `diff`, when `HEAD` moved, adds what a commit, merge or checkout did: `D` deleted (unless the baseline holds it as deleted), `A` created, any other letter blind; those two only for a path the baseline does not hold. An untracked path the diff adds was committed. `'first'`: the baseline had no `HEAD`, so there is no diff and every untracked path that left the status was committed.
 */
export function shellChanges(before: Map<string, string>, after: Map<string, string>, root: string, cwd: string, diff: Map<string, string> | 'first' = new Map(), named: (path: string) => boolean = () => false, reverts = false, written: ReadonlySet<string> = new Set()): ShellChange[] {
  const at = (p: string) => normalize(`${root}/${p}`, cwd)
  const out: ShellChange[] = []
  const other = (p: string) => (named(p) ? 'edited' : 'blind')
  const push = (path: string, change: ShellChange['change'], history = false, count?: ShellChange['count']) =>
    out.push({ path, change, ...(named(path) && (change === 'created' || change === 'edited') && { named: true }), ...(history && { history }), ...(count && { count }) })
  for (const [p, code] of after) {
    const untracked = code === '??' ? { path: p, untracked: true } : undefined
    if (before.get(p) === code && !worktree(p) && written.has(at(p))) push(at(p), 'edited', false, untracked)
    if (before.get(p) === code || worktree(p)) continue
    const change = code.includes('D') ? 'deleted' : code === '??' || code[0] === 'R' || code[0] === 'A' ? 'created' : other(at(p))
    push(at(p), change, false, untracked ?? (change === 'edited' && !before.has(p) ? { path: p, untracked: false } : undefined))
  }
  for (const [p, code] of before) {
    if (worktree(p) || after.has(p)) continue
    if (diff !== 'first' && !diff.has(p) && (code === '??' || reverts)) push(at(p), code === '??' ? 'deleted' : 'reverted')
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

/** F07-R23: the two numbers `git diff --numstat` prints, the lines added and removed; null for a binary file (`-`) or no output. */
export const linesOf = (stdout: string): { added: number; removed: number } | null => {
  const m = /^(\d+)\t(\d+)\t/.exec(stdout)
  return m ? { added: Number(m[1]), removed: Number(m[2]) } : null
}

/** F07-R20: what changed between two baselines with no command of Claude's between them (a turn's start): a `D` deleted, any other new or changed letters external. */
export function outsideChanges(before: Map<string, string>, after: Map<string, string>, root: string, cwd: string): { path: string; change: 'deleted' | 'external' }[] {
  return [...after].filter(([p, code]) => before.get(p) !== code && !worktree(p)).map(([p, code]) => ({ path: normalize(`${root}/${p}`, cwd), change: code.includes('D') ? 'deleted' : 'external' }))
}
