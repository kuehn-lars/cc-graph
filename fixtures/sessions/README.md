# Recorded sessions

## `reference.ts`: the reference session (specs/04-reference-session)

The 13 steps, the compaction and the second turn of 04 Reference session, recorded from Claude Code 2.1.296 (Haiku, `claude -p`, 2026-10-12) in a copy of `fixtures/sample-app`. `export default { claudeCode, events }`; each event is `{ process, step?, event, input, result }`, in the order the hooks ran:

- `input` and `result` are what a throwaway probe mod saw at that event: `session.start`, `prompt.submit`, `turn.start`, `tool.call` (the `next(e)` result: `ref`, `result`, `text`, `isError`), `session.compact`, `prompt.attachment`, `classic.InstructionsLoaded`. Nothing is edited. Paths are those of the recording copy (`/private/tmp/claude-501/rec-ref/sample-app/…`).
- `process` counts the `claude -p` runs: 1 turn 1, 2 the `/compact`, 3 turn 2 (`session.start` fires once in each).
- `step` is the story's step (1 to 13) on the 14 `tool.call` rows.
- Only `prompt.attachment` rows of type `file`, `nested_memory`, `instructions` (the project `CLAUDE.md`) and `edited_text_file` are kept. The others (environment, model, skill listing, session context with the person's email, token reminders, …) are engine boilerplate and personal context; `scripts/record-reference-session.mjs` drops them and changes nothing else.
- It is `.ts`, not `.json`, because a test can import only code-named files (as `fixtures/tool-results`).

How the recording differs from the story (the spec follows the recording, not the reverse):

| Spec says | Recorded |
| --- | --- |
| `routes/index.ts` has 120 lines | `totalLines` 121 (the trailing newline) |
| Step 7 and 12 `log_decision` result is the F12 tool's | The probe serves the tool (`$.tool.register`, F12-R1) and answers `{ result: '{"logged":true,"id":"D1"}' }`. The engine refuses an object as a plugin tool's result ("expected string, array or undefined"), so F12-R4's `{ result: { logged: true, id } }` cannot work as written. The model's tool input is real; the result is the probe's answer, not Claude Code's |
| Step 13 `npm test`: exit 0, output has `src/auth/login.ts:21` | Exit 1 (`isError: true`): the sample app's imports have no `.ts` extension, so `node --test` cannot load `login.test.ts` (`ERR_MODULE_NOT_FOUND`). No `login.ts:21` in the output. Not faked |
| Compaction 33,942 to 5,616 tokens | 22,694 to 4,959 (Claude Code ran with `--setting-sources project`, so the prompt is smaller). Two kept messages, `user` summary and `assistant`, no tool use: `kept: 0` as specified |
| Re-attachments captured in spike S1 | Five `file` attachments (`login.ts`, `rateLimit.ts`, `config.ts`, `redis.ts`, `sessions.ts`) arrive at the first request of turn 2, in this recording's own session, so their paths match its `tool.call` rows. The spike's copies (`spike-s1/`, other paths) were not spliced in |
| Step 9 `git status` shows `package.json`, `package-lock.json` modified | The mod's own `git` call, not a recorded event; the copy's `git diff` does show both |
| The summarizer | Its requests raise `instructions` and `nested_memory` attachments with an `agentId` (process 2); kept, filter them as spike S1 says |

## Record again

1. Copy `fixtures/sample-app` to `/private/tmp/claude-501/rec-ref/sample-app` (any folder works, the paths in the fixture change), `git init`, commit. Between attempts: `git checkout . && git clean -fdx`, and empty `/tmp/cc-graph-reference/`.
2. Run each command from inside the copy with the probe mod (`fixtures/sessions/reference-probe`, plugin name `cc-graph` so its tool is `mcp__cc-graph__log_decision`), `<probe>` being its absolute path:
   1. `claude -p --model haiku --setting-sources project --plugin-dir <probe> --permission-mode acceptEdits --session-id <new uuid> --allowedTools "Bash(rg:*)" "Bash(npm:*)" "mcp__cc-graph__log_decision" -- "$(cat <repo>/fixtures/sessions/reference-turn1.txt)"`
   2. The same command with `--resume <that uuid>` instead of `--session-id` and the prompt `/compact`.
   3. In `reference-probe/hooks/register.tsx` set `let decisions = 1` (process 3 numbers D2), then the same command with `--resume <uuid>` and `reference-turn2.txt`. Set it back to 0.
   The prompts spell the steps out, one tool call each, because Claude will not take them on its own; Haiku followed them exactly. `npm install` needs the network.
3. `node scripts/record-reference-session.mjs fixtures/sessions/reference.ts /tmp/cc-graph-reference/log-*.json`, the three logs in order of their timestamps.
4. Check no personal text got in (`grep -c "icloud" fixtures/sessions/reference.ts` is 0) and `claude plugin test`.

## `subagents.ts`: an Explore agent and a worktree agent (F15)

One `claude -p` run (Haiku, Claude Code 2.1.296, 2026-10-12) in a copy of `fixtures/sample-app` (`/private/tmp/claude-501/rec-sub/sample-app/`), with the throwaway probe `subagents-probe/`. `export default { claudeCode, events }`; each event is `{ step?, event, input, result, … }` in the order the hooks ran: `session.start`, `turn.start`, `agent.spawn` and `tool.call` (the `next(e)` result). `agent.spawn` rows add `agentListAfterSpawn`, and each subagent's first `tool.call` adds `agentListAtFirstCall`: the rows `$.agent.list()` answered then. Nothing is edited; `scripts/record-subagents-session.mjs` only adds `step` (1 the Explore `Agent` call, 2 the main loop's `Read`, 3 the worktree `Agent` call) to those three `tool.call` rows. The prompt is `subagents-turn1.txt`.

### What the recording answers

| Question | Answer |
| --- | --- |
| Does a subagent's `tool.call` carry `agentId`? | Yes, on every call of its loop (`Bash`, `Read`, `Edit`), the id `agent.spawn` answered and `$.agent.list()` names (`aa0f6a26db57a5beb`). The main loop's calls, `Agent` included, have none. |
| Does `turn.start` stay silent for a subagent? | Yes. Three `turn.start` rows, none with `agentId`: the prompt, then one `<task-notification>` turn for each finished agent. |
| The `agent.list` row | `{ id, description, type, status }`. `type` is `Explore`, or `general-purpose` when the `Agent` call names none; `description` is the call's `description` word for word. `status` is `running`, then `completed`. |
| Is the row there at the agent's first `tool.call`? | Yes (`agentListAtFirstCall`), and already right after `agent.spawn`. A finished agent stays in the list for the rest of this run (the Explore row, `completed`, is still there at the worktree agent's first call). |
| Where does the worktree live? | `<cwd>/.claude/worktrees/agent-<agentId>/`, on branch `worktree-agent-<agentId>`. It stays after the run; the copy's `git status` shows `?? .claude/`. The edit is in the worktree only, the main checkout is unchanged. |
| The worktree agent's `Read` and `Edit` | Absolute `file_path` under the worktree (`…/.claude/worktrees/agent-<id>/src/auth/login.ts`); so are the `filePath`s in their results. |
| Its `rg` | Runs in the worktree: `rg -n verify src/auth` prints `src/auth/password.ts:21:…`, relative to the worktree, no prefix. The Explore agent's `rg -n verify` (main checkout) prints the same relative form. A `Bash` `tool.call` carries no `cwd`. |

F15-R4 and F15-R9 hold: the id is in the list at first sight, and the worktree path has the shape R9 names (name `agent-<id>`).

### How the run differed from the steps

- The agents run in the background (`Agent` result `isAsync: true`, `status: async_launched`), so the main loop's `Read` (step 2) landed between the Explore agent's `rg` and its two `Read`s, not after them. Its result is `numLines: 40` of `totalLines: 49`, a real partial read of the file the Explore agent then read whole.
- The Explore agent read `src/auth/password.ts` and `src/auth/login.ts`, both whole (the only two files that match). Step 3's agent ran `Read`, `Edit`, `Bash` in that order, as asked, and had no `subagent_type` (so `general-purpose`).
- Two earlier attempts are not the recording: the first never loaded the probe (`on` passed to a helper), the second had the main loop read `src/auth/password.ts`, which has 31 lines and so came back whole, not partial.

### Record again

1. Copy `fixtures/sample-app` to `/private/tmp/claude-501/rec-sub/sample-app`, `git init`, commit. Between attempts: remove the worktrees (`git worktree remove --force .claude/worktrees/*`), `git checkout . && git clean -fdx`, and empty `/tmp/cc-graph-subagents/`.
2. From inside the copy: `claude -p --model haiku --setting-sources project --plugin-dir <repo>/fixtures/sessions/subagents-probe --permission-mode acceptEdits --session-id <new uuid> --allowedTools "Bash(rg:*)" < /dev/null -- "$(cat <repo>/fixtures/sessions/subagents-turn1.txt)"`
3. `node scripts/record-subagents-session.mjs fixtures/sessions/subagents.ts /tmp/cc-graph-subagents/log-*.json`
4. Check no personal text got in (`grep -ci "icloud\|kuehn\|lars" fixtures/sessions/subagents.ts` is 0).

## `memory.ts`: a nested CLAUDE.md loads mid-turn (F04)

One `claude -p` run (Haiku, Claude Code 2.1.296, 2026-10-12) in a copy of `fixtures/sample-app` (`/private/tmp/claude-501/rec-mem/sample-app/`), with the throwaway probe `memory-probe/`. `export default { claudeCode, events }`; each event is `{ event, input, result, usage? }` in the order the hooks ran: `session.start`, `session.measure`, `classic.InstructionsLoaded`, `session.measure`. `usage` is what `$.session.usage({ breakdown: 'summary' })` answered inside the hook, taken at `session.start` and at each `session.measure` whose `changed` holds `context`. The prompt is `memory-turn1.txt` (one `Read` of `src/auth/login.ts`, which loads `src/auth/CLAUDE.md`). `scripts/record-memory-session.mjs` changes one thing: the home folder in `transcript_path` becomes `/home/user`.

### What the recording answers

| Question | Answer |
| --- | --- |
| Before the nested load, does `memoryFiles` hold only the project `CLAUDE.md`? | Yes: one entry, `{ path, type: 'Project', tokens: 60 }`, at `session.start` and at the first `session.measure`. |
| After the nested load, does it hold both files? | **No.** The second `session.measure` (after `classic.InstructionsLoaded`) still lists only the project `CLAUDE.md`; its `Memory files` category is still 60 tokens. The nested file's text is counted under `Messages` (1926 then 2754 tokens). So a refresh of `memory` from the breakdown drops the note `classic.InstructionsLoaded` added (F04-R1 vs F04-R3). |
| Is `path` absolute, and is `type` the label `memory_type` gives? | Absolute. `type` is `Project`, the same word `memory_type` carries for both files. |
| Does `session.measure` report `context` in `changed` after the turn? | Yes, both times (`context,rateLimits,cost`, then `context,cost`). |
| Order | `classic.InstructionsLoaded` fired between the two measures, before the turn's second API response. `session.start` carries no `usage.context.tokens`, only `window`. |

### How the run differed from the ticket

- A throwaway `CLAUDE_CONFIG_DIR` is not logged in (`Not logged in`), so the run used the real config. It has no user `CLAUDE.md` and no rules folder, and the copy's path has no auto-memory, so no personal file was in context; `--setting-sources project` kept the settings out. The only personal text in the log was `transcript_path`, rewritten as above.
- Two `session.measure` rows, not one per API response: the first fired before the nested load, the second after the turn's last response.

### Record again

1. Copy `fixtures/sample-app` to `/private/tmp/claude-501/rec-mem/sample-app`, `git init`, commit. Empty `/tmp/cc-graph-memory/`.
2. From inside the copy: `claude -p --model haiku --setting-sources project --plugin-dir <repo>/fixtures/sessions/memory-probe --permission-mode acceptEdits --session-id <new uuid> < /dev/null -- "$(cat <repo>/fixtures/sessions/memory-turn1.txt)"`
3. `node scripts/record-memory-session.mjs fixtures/sessions/memory.ts /tmp/cc-graph-memory/log-*.json`
4. Check no personal text got in (`grep -ci "icloud\|kuehn\|lars" fixtures/sessions/memory.ts` is 0).

## `wide.ts` and `many-changes.ts`: more files than a cap of 20 (F14)

Two recordings (Haiku, Claude Code 2.1.296, 2026-10-13) with the throwaway probe `wide-probe/`, which logs `session.start`, `turn.start` and every `tool.call` and changes nothing. `export default { claudeCode, events }`; each event is `{ process, event, input, result }` in the order the hooks ran. Nothing is edited; `scripts/record-wide-session.mjs` adds `process` and rewrites the home folder to `/home/user`.

- **`wide.ts` (F14-AC1):** a generated project of 30 files (`src/m01.ts` to `src/m30.ts`, four lines each; `m14`, `m20`, `m25` hold a `// TODO` line) in `/private/tmp/claude-501/rec-wide/wide/`. Two `claude -p` processes (`--resume` for the second), prompts `wide-turn1.txt` and `wide-turn2.txt`. Turn 1: `Read` of `m01` to `m13`, then `rg -n "TODO" src`. Turn 2: `Read` of `m14` to `m26`, then three `Edit`s (`m14`, `m20`, `m25`). 30 tool calls: 26 files read over two turns, one search, three changed files. Each process fires `session.start` and one `turn.start`.
- **`many-changes.ts` (F14-AC8):** one process in a fresh repository holding only a `README.md` (`/private/tmp/claude-501/rec-wide/many/`), prompt `many-changes-turn1.txt`: 24 `Write`s of new files `out/g01.ts` to `out/g24.ts`, every result `type: "create"`. 24 changed files.

How the runs differed from the ticket: none. The first attempt never loaded the probe (`on(event, …)` with a variable event name; the engine wants string literals), so its log is not the recording. The generated project and the prompts are the only inputs; the files are not committed (the script writes them).

### Record again

1. `node scripts/record-wide-session.mjs gen /private/tmp/claude-501/rec-wide/wide`, `git init` and commit there. For the second recording make `/private/tmp/claude-501/rec-wide/many` with a `README.md`, `git init`, commit. Empty `/tmp/cc-graph-wide/` before each recording.
2. From inside the copy: `claude -p --model haiku --setting-sources project --plugin-dir <repo>/fixtures/sessions/wide-probe --permission-mode acceptEdits --session-id <new uuid> --allowedTools "Bash(rg:*)" < /dev/null -- "$(cat <repo>/fixtures/sessions/wide-turn1.txt)"`, then the same with `--resume <that uuid>` and `wide-turn2.txt`. For `many-changes` only the first command, with `many-changes-turn1.txt` and no `--allowedTools`.
3. `node scripts/record-wide-session.mjs fixtures/sessions/wide.ts 30 /tmp/cc-graph-wide/log-*.json` (the two logs in order of their timestamps), and `… fixtures/sessions/many-changes.ts 24 /tmp/cc-graph-wide/log-*.json`. The number is the tool calls expected.
4. Check no personal text got in (`grep -ci "icloud\|kuehn\|lars\|/Users" fixtures/sessions/wide.ts fixtures/sessions/many-changes.ts` is 0).

## `spike-s1/`

The five `file` attachment texts and the compaction result captured in spike S1 (F03-Q1); see `specs/features/F03-context-layer/spike-s1.md`.
