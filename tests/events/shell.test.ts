import out from '../../fixtures/output/outputs'
import reference from '../../fixtures/sessions/reference'
import { expect, mock, test } from 'claude-code/testing'
import { node } from '../ui/kit'
import { engine, nodeOf, seedGraph, start, turn, written } from './kit'

const step = (tool: string) => reference.events.find(e => e.event === 'tool.call' && (e.input as any).tool === tool && (e.result as any).result?.filePath)!

// A Bash result as the sessions record it (fixtures/sessions/reference.ts), with no output.
const recorded = reference.events.find(e => e.event === 'tool.call' && (e.input as any).command?.startsWith('rg -n'))!
const quiet = { ...(recorded.result as any).result, stdout: '' }
const npm = 'npm install --no-audit --no-fund --loglevel=error rate-limiter-flexible' // the command the captures ran

const cwds: string[] = [] // the cwd of each process.run the last git() stand-in saw, in step with its result
/**
 * The test's `git` beneath the mod: `rev-parse --show-toplevel` answers `root` (or fails), each `status` the next of `statuses`, each `rev-parse HEAD` the next of `heads` (none: no commits), each `diff` the next of `diffs` (the last of each repeats).
 * `trees` answers `status` by cwd (a worktree); null: git cannot run there. Returns the argument lists it saw; `cwds` holds the cwd of each.
 */
function git(on: any, statuses: string[], root: string | null = '/w', heads: string[] = [], diffs: string[] = [], trees: Record<string, string | null> = {}) {
  const seen: string[][] = []
  cwds.length = 0
  const next = (xs: string[]) => (xs.length > 1 ? xs.shift()! : xs[0] ?? '')
  on('command.register', (_$: any, e: any) => ({ value: { command: e.name } }))
  on('process.run', (_$: any, e: any) => {
    seen.push([...e.argv])
    cwds.push(e.init?.cwd)
    if (e.argv[1] === 'rev-parse' && e.argv[2] === 'HEAD')
      return { value: heads.length ? { exitCode: 0, stdout: `${next(heads)}\n`, stderr: '' } : { exitCode: 128, stdout: '', stderr: 'fatal: ambiguous argument HEAD' } }
    if (e.argv[1] === 'rev-parse') return { value: root ? { exitCode: 0, stdout: `${root}\n`, stderr: '' } : { exitCode: 128, stdout: '', stderr: 'fatal: not a git repository' } }
    if (e.argv[1] === 'diff') return { value: { exitCode: 0, stdout: next(diffs), stderr: '' } }
    if (e.argv[1] === 'grep') return { value: { exitCode: 1, stdout: '', stderr: '' } } // F07-R2: no importers
    if (e.init?.cwd in trees) { // F07-R16: a worktree answers for itself
      if (trees[e.init.cwd] === null) throw new Error('ENOENT')
      if (e.argv[1] === 'status') return { value: { exitCode: 0, stdout: trees[e.init.cwd], stderr: '' } }
    }
    return { value: { exitCode: 0, stdout: next(statuses), stderr: '' } }
  })
  return seen
}

/** Starts the session and a turn, runs one Bash `command`, and lets the queue drain after each. */
async function session($: any, clock: any, command = npm) {
  await start($); await clock.advance(50)
  await turn($); await clock.advance(50)
  await $.tool.call({ tool: 'Bash', command }); await clock.advance(50)
}

test('F07-AC2 npm install rewrites package.json: change blind, state unread, a reason naming npm install', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  git(on, [out['git-status-clean'].stdout, out['git-status-clean'].stdout, out['git-status-after-npm-install'].stdout])
  await session($, clock)
  expect(await nodeOf('package.json')).toMatchObject({ change: 'blind', state: 'unread', reason: `changed by \`${npm.slice(0, 59)}…\`` })
})

test('F07-AC12 a file a command created is created, unread, with a reason naming the command', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  git(on, [out['git-status-clean'].stdout, out['git-status-clean'].stdout, out['git-status-after-npm-install'].stdout])
  await session($, clock, 'npm run codegen')
  expect(await nodeOf('src/middleware/rateLimit.ts')).toMatchObject({ change: 'created', state: 'unread', reason: 'created by `npm run codegen`' })
})

test('F07-AC13 rm and a rename: deleted files keep their state, the new path is created; one write of graph', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  seedGraph(on, { seq: 1, files: { 'src/db/redis.ts': node('src/db/redis.ts', 1) }, edges: [], decisions: [], compactions: [] })
  const after = out['git-status-after-npm-install'].stdout
  git(on, [after, after, out['git-status-variety'].stdout])
  await session($, clock, 'rm test/helpers.ts')
  expect(await nodeOf('src/db/redis.ts')).toMatchObject({ change: 'deleted', state: 'read', reason: 'deleted by `rm test/helpers.ts`' })
  expect(await nodeOf('test/helpers.ts')).toMatchObject({ change: 'deleted', state: 'unread' })
  expect(await nodeOf('src/db/store.ts')).toMatchObject({ change: 'created' })
  expect(written.graph.seq).toBe(5) // the seed's 1, then one touch for each of the four paths, in one write
})

test('F07-AC14 an untracked file a command removed is deleted', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  const variety = out['git-status-variety'].stdout
  git(on, [variety, variety, out['git-status-after-npm-install'].stdout])
  await session($, clock, 'rm "notes with space.md"')
  expect(await nodeOf('notes with space.md')).toMatchObject({ change: 'deleted' })
})

test('F07-AC15 outside a repository a Bash call runs no git status, and the footer says "Shell changes need git" once', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  const seen = git(on, [''], null)
  await session($, clock)
  await $.tool.call({ tool: 'Bash', command: 'rm a.ts' }); await clock.advance(50)
  expect(seen.map(a => a[1])).toEqual(['rev-parse'])
  expect(written.notes).toEqual(['Shell changes need git'])
})

test('F07-R6 a change Claude made with Edit is not blamed on the next command', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  seedGraph(on, { seq: 1, files: { 'package.json': node('package.json', 1, { change: 'edited', added: 1 }) }, edges: [], decisions: [], compactions: [] })
  git(on, [out['git-status-clean'].stdout, out['git-status-clean'].stdout, out['git-status-after-npm-install'].stdout])
  await session($, clock)
  expect(await nodeOf('package.json')).toMatchObject({ change: 'edited', reason: null })
})

test('F07-R8 the git calls run off the hook\'s path: a Bash call returns before git status is asked', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  const seen = git(on, [out['git-status-clean'].stdout])
  await start($); await clock.advance(50)
  const before = seen.length
  await $.tool.call({ tool: 'Bash', command: npm })
  expect(seen.length).toBe(before)
  await clock.advance(50)
  expect(seen.slice(before).map(a => a[1])).toEqual(['status', 'rev-parse']) // F07-R14: HEAD comes with each status
  expect(seen.every(a => a[0] === 'git')).toBe(true)
})

// The recorded Write (step 6) and Edit (step 8) results, with the path of the tree these tests run in: derived, no session ran in /w.
const wrote = (path: string) => ({ ...(step('Write').result as any).result, filePath: `/w/${path}` })
const edited = (path: string) => ({ ...(step('Edit').result as any).result, filePath: `/w/${path}` })
const statusCount = (seen: string[][]) => seen.filter(a => a[1] === 'status').length

test('F07-AC16 a file Claude wrote with Write and a later rm removed is deleted, "deleted by `rm notes/draft.md`"', async ($, on) => {
  const clock = mock.clock(on)
  const answer = engine(on, { tool: 'Write', tool_use_id: 'x', input: {}, result: wrote('notes/draft.md') })
  git(on, ['', '', '?? notes/draft.md\0', ''])
  await start($); await clock.advance(50)
  await turn($); await clock.advance(50)
  await $.tool.call({ tool: 'Write', file_path: '/w/notes/draft.md', content: 'x' }); await clock.advance(50)
  Object.assign(answer, { result: quiet })
  await $.tool.call({ tool: 'Bash', command: 'rm notes/draft.md' }); await clock.advance(50)
  expect(await nodeOf('notes/draft.md')).toMatchObject({ change: 'deleted', reason: 'deleted by `rm notes/draft.md`' })
})

test('F07-AC3 an Edit of a.ts, then a command with a.ts modified in git status: a.ts stays edited, no blind mark', async ($, on) => {
  const clock = mock.clock(on)
  const answer = engine(on, { tool: 'Edit', tool_use_id: 'x', input: {}, result: edited('a.ts') })
  git(on, ['', '', ' M a.ts\0'])
  await start($); await clock.advance(50)
  await turn($); await clock.advance(50)
  await $.tool.call({ tool: 'Edit', file_path: '/w/a.ts', old_string: 'a', new_string: 'b' }); await clock.advance(50)
  Object.assign(answer, { result: quiet })
  await $.tool.call({ tool: 'Bash', command: npm }); await clock.advance(50)
  expect(await nodeOf('a.ts')).toMatchObject({ change: 'edited', reason: null })
})

test('F07-AC10 README.md modified between two turns: the second turn\'s npm test does not blame it', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  git(on, ['', '', ' M README.md\0'])
  await start($); await clock.advance(50)
  await turn($, 't1'); await clock.advance(50)
  await turn($, 't2'); await clock.advance(50)
  await $.tool.call({ tool: 'Bash', command: 'npm test' }); await clock.advance(50)
  expect(await nodeOf('README.md')).toBeUndefined()
})

test('NFR-P6 a burst of three Edits queues one baseline refresh', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Edit', tool_use_id: 'x', input: {}, result: edited('a.ts') })
  const seen = git(on, [''])
  await start($); await clock.advance(50)
  await turn($); await clock.advance(50)
  const before = statusCount(seen)
  for (let i = 0; i < 3; i++) await $.tool.call({ tool: 'Edit', file_path: '/w/a.ts', old_string: 'a', new_string: 'b' })
  await clock.advance(50)
  expect(statusCount(seen) - before).toBe(1)
})

// F07-R14. The HEADs: the capture's, and a second no repository produced (derived). The diffs are captured from real commits and a merge.
const head = [out['git-rev-parse-head'].stdout.trim(), 'b'.repeat(40)] as const
const clean = out['git-status-clean'].stdout

test('F07-AC17 git rm and git commit in one command: HEAD moved, the diff says D, test/helpers.ts is deleted, naming the command', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  const command = 'git rm -q test/helpers.ts && git commit -qm "drop helpers"'
  const seen = git(on, [clean], '/w', [head[0], head[0], head[1]], [out['git-diff-commit-delete'].stdout])
  await session($, clock, command)
  expect(await nodeOf('test/helpers.ts')).toMatchObject({ change: 'deleted', state: 'unread', reason: `deleted by \`${command}\`` })
  expect(seen).toContainEqual(['git', 'diff', '--name-status', '-z', '--no-renames', ...head])
})

test('F07-AC18 a merge moves HEAD and the diff says A side.txt: side.txt is created, unread, naming the command', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  git(on, [clean], '/w', [head[0], head[0], head[1]], [out['git-diff-merge-add'].stdout])
  await session($, clock, 'git merge side')
  expect(await nodeOf('side.txt')).toMatchObject({ change: 'created', state: 'unread', reason: 'created by `git merge side`' })
})

test('F07-AC19 ?? notes/b.md in the baseline, committed: the status no longer names it, the diff adds it, it is not deleted', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  git(on, [clean, '?? notes/b.md\0', clean], '/w', [head[0], head[0], head[1]], [out['git-diff-commit-untracked'].stdout])
  await session($, clock, 'git add notes/b.md && git commit -qm b')
  expect((await nodeOf('notes/b.md'))?.change).not.toBe('deleted')
})

test('F07-R14 HEAD unchanged: no diff runs (NFR-P6)', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  const seen = git(on, [clean], '/w', [head[0]])
  await session($, clock, 'git status')
  expect(seen.filter(a => a[1] === 'diff')).toEqual([])
})

test('F07-AC27 the first commit of a repository (no HEAD before): no diff runs, and an untracked file it committed is not deleted', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  const heads = [] as string[] // no commits: rev-parse HEAD fails, then (set below) answers
  const seen = git(on, [clean, '?? notes/b.md\0', clean], '/w', heads)
  await start($); await clock.advance(50)
  await turn($); await clock.advance(50)
  heads.push(head[1]) // the command's commit
  await $.tool.call({ tool: 'Bash', command: 'git add notes/b.md && git commit -qm b' }); await clock.advance(50)
  expect((await nodeOf('notes/b.md'))?.change).not.toBe('deleted')
  expect(seen.filter(a => a[1] === 'diff')).toEqual([])
})

test('F07-AC22 a file the command appended to is edited, "changed by `printf …`", with no counted lines; package.json under npm pkg set stays blind', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  const command = "printf '// probe\\n' >> src/db/redis.ts"
  git(on, [clean, clean, out['git-status-appended'].stdout])
  await session($, clock, command)
  expect(await nodeOf('src/db/redis.ts')).toMatchObject({ change: 'edited', state: 'partial', seen: 'only what the command changed', added: 0, removed: 0, reason: `changed by \`${command}\`` })
})

test('F07-AC22 a change the command does not name stays blind', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  git(on, [clean, clean, out['git-status-after-npm-install'].stdout])
  await session($, clock, 'npm pkg set description=probe')
  expect(await nodeOf('package.json')).toMatchObject({ change: 'blind' })
})

// F07-R15, R16. Agent worktrees. The id is the one spike S4 recorded; the statuses are derived (no run created a worktree), in the `-z` form git-status-variety shows.
const AGENT = 'a279be1fce34363f9'
const WT = `/w/.claude/worktrees/agent-${AGENT}`

test('F07-AC20 a status naming .claude/worktrees/agent-<id>/ adds no node', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  git(on, [clean, clean, `?? .claude/worktrees/agent-${AGENT}/\0?? .claude/worktrees/agent-${AGENT}/src/a.ts\0`])
  await session($, clock, 'git worktree add .claude/worktrees/agent-x')
  expect(await nodeOf(`.claude/worktrees/agent-${AGENT}`)).toBeUndefined()
  expect(await nodeOf('src/a.ts')).toBeUndefined()
})

test('F07-AC21 a subagent rm in its worktree: the working tree node is deleted "in worktree agent-<id>", and no status runs in the working tree', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  const seen = git(on, [clean], '/w', [], [], { [WT]: ' D src/routes/index.ts\0' })
  await start($); await clock.advance(50)
  await turn($); await clock.advance(50)
  const from = seen.length
  await $.tool.call({ tool: 'Bash', command: 'rm src/routes/index.ts', agentId: AGENT } as any); await clock.advance(50)
  expect(await nodeOf('src/routes/index.ts')).toMatchObject({ change: 'deleted', reason: `deleted by \`rm src/routes/index.ts\` in worktree agent-${AGENT}` })
  expect(seen.map((a, i) => [a, cwds[i]] as const).slice(from).filter(([a]) => a[1] === 'status').map(([, cwd]) => cwd)).toEqual([WT])
})

test('F07-R16 where git cannot run in the worktree, the working tree answers, and its reason does not claim a worktree', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  git(on, [clean, clean, ' D src/routes/index.ts\0'], '/w', [], [], { [WT]: null })
  await start($); await clock.advance(50)
  await turn($); await clock.advance(50)
  await $.tool.call({ tool: 'Bash', command: 'rm src/routes/index.ts', agentId: AGENT } as any); await clock.advance(50)
  expect(await nodeOf('src/routes/index.ts')).toMatchObject({ change: 'deleted', reason: 'deleted by `rm src/routes/index.ts`' })
})

test('F07-R13 a file a subagent wrote in its worktree and a later rm there removed is deleted "in worktree agent-<id>"', async ($, on) => {
  const clock = mock.clock(on)
  const answer = engine(on, { tool: 'Write', tool_use_id: 'x', input: {}, result: wrote(`.claude/worktrees/agent-${AGENT}/notes/draft.md`) })
  const trees: Record<string, string | null> = { [WT]: '' } // read at each call, so the test changes it between them
  git(on, [clean], '/w', [], [], trees)
  await start($); await clock.advance(50)
  await turn($); await clock.advance(50)
  trees[WT] = '?? notes/draft.md\0'
  await $.tool.call({ tool: 'Write', file_path: `${WT}/notes/draft.md`, content: 'x', agentId: AGENT } as any); await clock.advance(50)
  trees[WT] = ''
  Object.assign(answer, { result: quiet })
  await $.tool.call({ tool: 'Bash', command: 'rm notes/draft.md', agentId: AGENT } as any); await clock.advance(50)
  expect(await nodeOf('notes/draft.md')).toMatchObject({ change: 'deleted', reason: `deleted by \`rm notes/draft.md\` in worktree agent-${AGENT}` })
})

// F07-R17: a change the command names is Claude's own, as an Edit is (F01-R4).
const ONLY = 'only what the command changed'

test('F07-AC30 sed -i on a file Claude only searched: edited, partial "only what the command changed", its tokens and readId kept', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  seedGraph(on, { seq: 1, files: { 'src/auth/login.ts': node('src/auth/login.ts', 1, { state: 'search', hits: 2, tokens: 31, readId: 'r1', seen: '2 search hits, never opened' }) }, edges: [], decisions: [], compactions: [] })
  const command = "sed -i '' 's/verify/verifyUser/' src/auth/login.ts"
  git(on, [clean, clean, ' M src/auth/login.ts\0'])
  await session($, clock, command)
  expect(await nodeOf('src/auth/login.ts')).toMatchObject({ change: 'edited', state: 'partial', seen: ONLY, tokens: 31, readId: 'r1', reason: `changed by \`${command}\`` })
})

test('F07-AC31 a file a command names and creates is created, partial "only what the command changed"', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  const command = 'echo "export const u = 1" > src/util.ts'
  git(on, [clean, clean, '?? src/util.ts\0'])
  await session($, clock, command)
  expect(await nodeOf('src/util.ts')).toMatchObject({ change: 'created', state: 'partial', seen: ONLY, tokens: null, added: 0, reason: `created by \`${command}\`` })
})

test('F07-R17 a named change keeps a read node read, and a ghost it names becomes partial', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  seedGraph(on, { seq: 2, files: { 'a.ts': node('a.ts', 1), 'b.ts': node('b.ts', 2, { state: 'ghost', tokens: null, mainLoop: false }) }, edges: [], decisions: [], compactions: [] })
  git(on, [clean, clean, ' M a.ts\0 M b.ts\0'])
  await session($, clock, "sed -i '' s/x/y/ a.ts b.ts")
  expect(await nodeOf('a.ts')).toMatchObject({ change: 'edited', state: 'read', seen: '10 lines' })
  expect(await nodeOf('b.ts')).toMatchObject({ change: 'edited', state: 'partial', seen: ONLY })
})

// F07-R6: a tracked change that leaves the status while HEAD stays was reverted.
test('F07-AC35 git checkout -- of a file Claude edited clears its change and its blind edges; a path with no node gets none', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  const ghost = node('src/db/redis.ts', 1, { state: 'ghost', tokens: null, mainLoop: false })
  seedGraph(on, { seq: 1, files: { 'src/config.ts': node('src/config.ts', 1, { change: 'edited', added: 1, removed: 1, line: 4 }), 'src/db/redis.ts': ghost }, edges: [{ from: 'src/db/redis.ts', to: 'src/config.ts', kind: 'import', blind: true, guessed: false }], decisions: [], compactions: [] })
  const dirty = ' M src/config.ts\0 M README.md\0'
  git(on, [dirty, dirty, clean], '/w', [head[0]])
  await session($, clock, 'git checkout -- src/config.ts README.md')
  expect(await nodeOf('src/config.ts')).toMatchObject({ change: null, reason: null, added: 0, removed: 0 })
  expect(await nodeOf('README.md')).toBeUndefined()
  expect(written.graph.edges).toEqual([{ from: 'src/db/redis.ts', to: 'src/config.ts', kind: 'import', blind: false, guessed: false }])
})

test('F07-AC35 git stash takes the change away but the file stays edited', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  seedGraph(on, { seq: 1, files: { 'src/config.ts': node('src/config.ts', 1, { change: 'edited', added: 1, removed: 1 }) }, edges: [], decisions: [], compactions: [] })
  git(on, [' M src/config.ts\0', ' M src/config.ts\0', clean], '/w', [head[0]])
  await session($, clock, 'git stash')
  expect(written.graph).toBeUndefined() // the seeded node, edited, is not touched
})

test('F07-R6 a deleted file a command restores loses its deletion', async ($, on) => {
  const clock = mock.clock(on)
  engine(on, { tool: 'Bash', tool_use_id: 'x', input: {}, result: quiet })
  seedGraph(on, { seq: 1, files: { 'test/helpers.ts': node('test/helpers.ts', 1, { state: 'unread', change: 'deleted', reason: 'deleted by `rm test/helpers.ts`' }) }, edges: [], decisions: [], compactions: [] })
  git(on, [' D test/helpers.ts\0', ' D test/helpers.ts\0', clean], '/w', [head[0]])
  await session($, clock, 'git restore test/helpers.ts')
  expect(await nodeOf('test/helpers.ts')).toMatchObject({ change: null, reason: null })
})
