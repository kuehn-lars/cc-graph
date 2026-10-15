# Spike S4: what the engine says about a shell command's changes (F07-Q2)

Claude Code 2.1.300, 2026-10-15. Probe mod kept outside the repository (never merged). It logged every `tool.call` with the whole `next(e)` result, and every `agent.spawn`. Model Haiku, `claude -p --setting-sources project --permission-mode bypassPermissions`, in a fresh copy of `fixtures/sample-app` (`git init -b main`, one commit). The prompt below spells out one tool call per step, and every step ran as written.

The mod's own `git` calls are not part of the recording. The "mod today" column replays the statuses `git status` gives before and after each step through `shellChanges` (F07-R6 as shipped in v0.2).

| Step | Call | Engine extras on the result | `git` sees | Mod today |
| --- | --- | --- | --- | --- |
| 1 | `Write notes/draft.md` | none | `?? notes/draft.md` | `created` (F01) |
| 2 | `rm notes/draft.md` | none | nothing | **missed**: the baseline was taken before step 1, so the file is in neither status; the node stays `created` |
| 3 | `cat src/auth/login.ts` | `isReadOnly: true` | nothing | **no node**: shell reads are not tracked (F01, Out of scope) |
| 4 | `sed -n '1,5p' src/config.ts` | `isReadOnly: true` | nothing | **no node** |
| 5 | `Read src/db/redis.ts` | `isReadOnly: true` | nothing | `read` |
| 6 | `printf '// probe\n' >> src/db/redis.ts` | none, no `staleReadFileStateHint` | ` M src/db/redis.ts` | `blind`, "changed unseen", although the command names the file and Claude wrote the line |
| 7 | `Edit src/config.ts` | none | ` M src/config.ts` | `edited` |
| 8 | `sed -i '' 's/probe/probe2/' src/config.ts` | none | ` M src/config.ts`, as before | missed (the known re-change limit); harmless, the node is already `edited` |
| 9 | `git rm -q test/helpers.ts && git commit -qm "drop helpers"` | none, no `gitOperation` | nothing: the deletion is committed | **missed** |
| 10 | `git checkout -b side && … && git checkout main && git merge side` | none, no `gitOperation` | nothing: `side.txt` arrives committed | **missed** |
| 11 | `cat > src/new.ts <<'EOF' …` | none | `?? src/new.ts` | `created` |
| 12 | `npm pkg set description=probe` | none | ` M package.json` | `blind`, correct: the command does not name the file |
| 13, 14 | a file in `node_modules/` written, then removed | none | nothing (ignored) | nothing, as specified (Out of scope) |
| 15, 16 | `Write notes/b.md`, then `git add notes/b.md && git commit -qm b` | none | `?? notes/b.md`, then nothing | correct here. With a baseline that holds `?? notes/b.md` (a `Bash` call or a new turn between the two steps) the replay gives **`deleted`**: a commit reads as a deletion |
| 17 | `Agent`, `isolation: 'worktree'`, which runs `rm src/routes/index.ts` | `Agent` result: `agentId`, no path | main tree: `?? .claude/worktrees/agent-<agentId>/`; the worktree's own status: ` D src/routes/index.ts` | **wrong twice**: the next `Bash` call adds a `created` node `.claude/worktrees/agent-…`, and the deletion is never seen |

The same steps on a dirty copy (an earlier attempt) gave the same extras: none.

## Answers

- **F07-Q2: no.** `bashEditDiff` (typed `@internal` in `claude-code-tools`) was absent from every `Bash` result, for `rm`, `printf >>`, `sed -i`, a heredoc, `npm pkg set`, `git rm` with a commit, and a merge. `gitOperation` was absent even for commits and the merge, and `staleReadFileStateHint` was absent after a `Read` and then an append. The `git` baseline stays. These fields may be filled only for an interactive client ("for rendering"). An interactive run under `expect` did not start in the sandbox, so that case is untried. F07 does not depend on them either way.
- **`isReadOnly`** is set on `cat`, `sed -n` and `Read`, and absent on every command that wrote. A read-only `Bash` call changes no file, so it needs no `git status`.
- **Worktrees:** both recordings named the worktree `.claude/worktrees/agent-<agentId>`, with the `agentId` that `agent.spawn` returns and the `Agent` result carries. Neither `agent.spawn`'s input nor the subagent's `tool.call` carries the worktree path or a `cwd`.
- **Commits move `HEAD`, not the status.** Steps 9 and 10 change files on disk and leave `git status` as it was. Comparing `HEAD` before and after (`git rev-parse HEAD`, then `git diff --name-status` between the two) names them. The same comparison tells step 16's commit from a deletion: the diff adds the path.

## Untried

- An interactive session (the extras above may appear there).
- A background command (`run_in_background`): its changes land after the call returns, so they will be named by the next command's status.
- `git stash`, `git reset --hard`, `git pull`, and a rebase.
- A worktree a `WorktreeCreate` hook puts outside `.claude/worktrees/`.

## Prompt

```text
This is a recording run. Do exactly these steps in order, one tool call per step, with exactly the command or input given. Do not read, check or fix anything else, and do not explain. Each Bash step is one Bash call with the command exactly as written.

1. Write tool: create `notes/draft.md` with the content `hello`.
2. Bash: `rm notes/draft.md`
3. Bash: `cat src/auth/login.ts`
4. Bash: `sed -n '1,5p' src/config.ts`
5. Read tool: read `src/db/redis.ts`.
6. Bash: `printf '// probe\n' >> src/db/redis.ts`
7. Edit tool: in `src/config.ts`, replace `export type Config` with `export /* probe */ type Config`.
8. Bash: `sed -i '' 's/probe/probe2/' src/config.ts`
9. Bash: `git rm -q test/helpers.ts && git commit -qm "drop helpers"`
10. Bash: `git checkout -q -b side && printf 'x\n' > side.txt && git add side.txt && git commit -qm side && git checkout -q main && git merge -q --no-edit side`
11. Bash: `cat > src/new.ts <<'EOF'
export const x = 1
EOF`
12. Bash: `npm pkg set description=probe`
13. Bash: `mkdir -p node_modules/x && printf 'a\n' > node_modules/x/a.js`
14. Bash: `rm node_modules/x/a.js`
15. Write tool: create `notes/b.md` with the content `b`.
16. Bash: `git add notes/b.md && git commit -qm b`
17. Agent tool: subagent_type `general-purpose`, isolation `worktree`, prompt: "Run exactly one Bash command, `rm src/routes/index.ts`, then reply done. Do nothing else."
```
