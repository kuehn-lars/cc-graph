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

/**
 * F07-R6: the paths a command changed, relative to `cwd` (I4): new and untracked, or the new path of a rename, `created`; deleted, or an untracked path gone, `deleted`; any other path new to the status or with other letters, `blind`.
 * A path that left the status otherwise (a commit, a checkout) changed nothing Claude needs to see.
 */
export function shellChanges(before: Map<string, string>, after: Map<string, string>, root: string, cwd: string): ShellChange[] {
  const at = (p: string) => normalize(`${root}/${p}`, cwd)
  const out: ShellChange[] = []
  for (const [p, code] of after) {
    if (before.get(p) === code) continue
    out.push({ path: at(p), change: code.includes('D') ? 'deleted' : code === '??' || code[0] === 'R' || code[0] === 'A' ? 'created' : 'blind' })
  }
  for (const [p, code] of before) if (code === '??' && !after.has(p)) out.push({ path: at(p), change: 'deleted' })
  return out
}
