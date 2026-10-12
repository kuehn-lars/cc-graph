// Pure: I4. Lexical normalization; relative to `cwd` when inside it, absolute otherwise.
const clean = (p: string): string => {
  p = p.replace(/\\/g, '/')
  const drive = /^[a-z]:/i.exec(p)?.[0].toLowerCase() ?? ''
  const rest = p.slice(drive.length)
  const out: string[] = []
  for (const s of rest.split('/')) s === '..' ? out.pop() : s !== '' && s !== '.' && out.push(s)
  return drive + (rest.startsWith('/') ? '/' : '') + out.join('/')
}

// F15-R9: `.claude/worktrees/<name>/<file>` inside the cwd. ponytail: a worktree a WorktreeCreate hook puts elsewhere stays an absolute path.
const WORKTREE = /^\.claude\/worktrees\/([^/]+)\/(.+)$/

const split = (path: string, cwd: string) => {
  const p = clean(path)
  const c = clean(cwd)
  const base = c.endsWith('/') ? c : c + '/'
  const rel = c !== '' && p.startsWith(base) ? p.slice(base.length) : null
  const wt = rel === null ? null : WORKTREE.exec(rel)
  return { path: wt ? wt[2]! : rel ?? p, worktree: wt ? wt[1]! : null }
}

export const normalize = (path: string, cwd: string): string => split(path, cwd).path
export const worktreeOf = (path: string, cwd: string): string | null => split(path, cwd).worktree
