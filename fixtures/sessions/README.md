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

## `spike-s1/`

The five `file` attachment texts and the compaction result captured in spike S1 (F03-Q1); see `specs/features/F03-context-layer/spike-s1.md`.
