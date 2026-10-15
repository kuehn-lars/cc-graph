// Pure: what a shell command did to the working tree, from `git status --porcelain=v1 -z --untracked-files=all` before and after it (F07-R5, R6).
import { normalize } from './path'

export type ShellChange = { path: string; change: 'created' | 'deleted' | 'blind' }

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

/**
 * F07-R6: the paths a command changed, relative to `cwd` (I4): new and untracked, or the new path of a rename, `created`; deleted, or an untracked path gone, `deleted`; any other path new to the status or with other letters, `blind`.
 * A path that left the status otherwise (a commit, a checkout) changed nothing Claude needs to see.
 * F07-R14: `diff`, when `HEAD` moved, adds what a commit, merge or checkout did: `D` deleted (unless the baseline holds it as deleted), `A` created, any other letter blind; those two only for a path the baseline does not hold. An untracked path the diff adds was committed.
 */
export function shellChanges(before: Map<string, string>, after: Map<string, string>, root: string, cwd: string, diff = new Map<string, string>()): ShellChange[] {
  const at = (p: string) => normalize(`${root}/${p}`, cwd)
  const out: ShellChange[] = []
  for (const [p, code] of after) {
    if (before.get(p) === code) continue
    out.push({ path: at(p), change: code.includes('D') ? 'deleted' : code === '??' || code[0] === 'R' || code[0] === 'A' ? 'created' : 'blind' })
  }
  for (const [p, code] of before) if (code === '??' && !after.has(p) && !diff.has(p)) out.push({ path: at(p), change: 'deleted' })
  for (const [p, letter] of diff) {
    const was = before.get(p)
    if (letter === 'D' ? was?.includes('D') : was !== undefined) continue
    if (after.has(p)) continue // the status named it (R6)
    out.push({ path: at(p), change: letter === 'D' ? 'deleted' : letter === 'A' ? 'created' : 'blind' })
  }
  return out
}
