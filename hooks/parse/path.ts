// Pure: I4. Lexical normalization; relative to `cwd` when inside it, absolute otherwise.
const clean = (p: string): string => {
  p = p.replace(/\\/g, '/')
  const drive = /^[a-z]:/i.exec(p)?.[0].toLowerCase() ?? ''
  const rest = p.slice(drive.length)
  const out: string[] = []
  for (const s of rest.split('/')) s === '..' ? out.pop() : s !== '' && s !== '.' && out.push(s)
  return drive + (rest.startsWith('/') ? '/' : '') + out.join('/')
}

export function normalize(path: string, cwd: string): string {
  const p = clean(path)
  const c = clean(cwd)
  const base = c.endsWith('/') ? c : c + '/'
  return c !== '' && p.startsWith(base) ? p.slice(base.length) : p
}
