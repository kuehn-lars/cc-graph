// node scripts/record-imports-session.mjs gen <dir>
//   copies fixtures/sample-app into <dir> and adds the files F06's cases need (the sample app itself stays as it is);
//   git init and commit it yourself.
// node scripts/record-imports-session.mjs <out.ts> <expected tool calls> <probe-log.json>
//   turns the log the imports probe wrote into fixtures/sessions/imports.ts. Every input and result is kept exactly as
//   the hook saw it; the home folder becomes `/home/user` (the repository is public). See fixtures/sessions/README.md.
import { homedir } from 'node:os'
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [first, ...rest] = process.argv.slice(2)
if (first === 'gen') {
  const dir = rest[0]
  cpSync(join(dirname(fileURLToPath(import.meta.url)), '../fixtures/sample-app'), dir, { recursive: true })
  const files = {
    // F06-AC6: a .js module Claude reads before login.ts, next to the sample app's password.ts
    'src/auth/password.js': `// Password helpers for the plain-JavaScript callers.\nexport function hashPassword(password) {\n  return password.split('').reverse().join('')\n}\n`,
    // F06-AC7: './util.js' with no src/util.ts anywhere
    'src/a.ts': `import { double } from './util.js'\n\nexport const four = double(2)\n`,
    // F06-AC3 and R4: a Python package
    'app/__init__.py': '',
    'app/models.py': `class User:\n    def __init__(self, name):\n        self.name = name\n`,
    'app/views.py': `from .models import User\nfrom . import models\nimport app.models\n\n\ndef show(name):\n    return User(name)\n`,
    // F06-AC11: an import inside a fenced code block of a file that is not code
    'docs/usage.md': '# Usage\n\n```ts\nimport { login } from \'../src/auth/login\'\n\nawait login(\'a@b.c\', \'secret\')\n```\n',
  }
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), text)
  }
} else {
  const [expected, log] = rest
  const events = JSON.parse(readFileSync(log, 'utf8').replaceAll(homedir(), '/home/user')).map(row => ({ process: 1, ...row }))
  const calls = events.filter(e => e.event === 'tool.call').length
  if (calls !== Number(expected)) throw new Error(`expected ${expected} tool calls, found ${calls}`)
  // .ts, not .json: a test can import only code-named files (as in fixtures/tool-results).
  writeFileSync(first, 'export default ' + JSON.stringify({ claudeCode: '2.1.296', events }, null, 1) + '\n')
}
