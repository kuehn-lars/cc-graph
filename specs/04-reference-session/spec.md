# 04 Reference session

| Status | Owner | Checked against |
| --- | --- | --- |
| Approved | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 |

One small project and one short story that every check replays. The story touches every node state, every change mark, a blind spot, a compaction, a nested memory file and two turns, so a single replay proves most of the product works together. Feature specs refer to it as "the reference session".

It is used two ways:

- **Scripted replay.** `fixtures/sessions/reference.ts` holds the events below with the results Claude Code returned; `tests/scenarios` replays them through the test kit and compares the graph with `fixtures/sessions/reference.golden.json` at each checkpoint. This is exact and runs in CI.
- **Manual check.** A person runs the same prompts in a real session in `fixtures/sample-app`. Claude will not take exactly these steps, so the manual check looks for the same shape, not the same graph.

## The sample project

`fixtures/sample-app` is a tiny TypeScript web app with a git repository of its own (created by the test setup, committed clean).

| Path | Lines | Imports | Role in the story |
| --- | --- | --- | --- |
| `CLAUDE.md` | 6 | | Project memory, loaded at start |
| `package.json` | 14 | | Changed by `npm install`, never read |
| `package-lock.json` | 40 | | Changed by `npm install`, never read |
| `src/config.ts` | 40 | | Read whole |
| `src/routes/index.ts` | 121 | `../auth/login` (line 3) | Read lines 1 to 40 |
| `src/auth/CLAUDE.md` | 4 | | Nested memory, loaded when Claude reads in `src/auth/` |
| `src/auth/login.ts` | 48 | `./password`, `./sessions` | Read whole, then edited |
| `src/auth/password.ts` | 30 | | Only seen through search hits |
| `src/auth/sessions.ts` | 31 | `../db/redis` | Read whole |
| `src/db/redis.ts` | 22 | `../config` | Read whole |
| `src/api/users.ts` | 35 | `../auth/login` | Never opened: the blind spot |
| `test/helpers.ts` | 18 | | Read whole in turn 2 |

A whole `Read` reports one line more than a hand count of the file (the trailing newline: `login.ts` 49, `routes/index.ts` 121); the checkpoints use the recorded `totalLines`.

Files Claude creates: `src/middleware/rateLimit.ts` (12 lines, imports only the package `rate-limiter-flexible`) and `test/login.test.ts` (7 lines, imports `../src/auth/login` and `./helpers`).

## The story

Settings: defaults, except `decisions: true` for the steps marked F12. Window: 200,000 tokens.

### Turn 1: "Add rate limiting to the login route."

| Step | Event | What Claude Code returns | Graph afterwards |
| --- | --- | --- | --- |
| 1 | `Read src/routes/index.ts`, offset 1, limit 40 | `text`, lines 1 to 40 of 121 | `routes/index.ts` `partial`; edge to `login.ts`, a ghost |
| 2 | `Read src/auth/login.ts` | `text`, 48 of 48 lines; `classic.InstructionsLoaded` for `src/auth/CLAUDE.md`, `nested_traversal` | `login.ts` `read`; ghosts `password.ts`, `sessions.ts`; nested memory listed |
| 3 | `Bash rg -n "verify" src/auth` | 4 lines: 2 in `login.ts`, 2 in `password.ts` | `password.ts` `search`, "2 search hits, never opened"; `login.ts` stays `read`, 2 hits |
| 4 | `Read src/auth/sessions.ts` | `text`, whole | `sessions.ts` `read`; ghost `db/redis.ts` |
| 5 | `Read src/db/redis.ts`, `Read src/config.ts` | `text`, whole, both | both `read`; edge `redis.ts → config.ts` |
| 6 | `Write src/middleware/rateLimit.ts` | `type: 'create'`, 12 lines | `rateLimit.ts` `read`, `created +12` |
| 7 | F12: `log_decision` "In-memory limiter, not Redis", files `rateLimit.ts`, `redis.ts` | The JSON string `{"logged":true,"id":"D1"}` (F12-R4) | decision D1 with two links |
| 8 | `Edit src/auth/login.ts` | one hunk, +2 −0 | `login.ts` `edited +2 −0`; edge `login.ts → rateLimit.ts`; queued `git grep` finds `routes/index.ts` and `api/users.ts` |
| 9 | `Bash npm install rate-limiter-flexible` | exit 0; `git status` then shows `package.json`, `package-lock.json` modified | both `unread`, `blind`, "changed by `npm install rate-limiter-flexible`" |

### Between turns: `/compact`

`session.compact` with `trigger: 'manual'`; result `tokensBefore: 22694`, `tokensAfter: 4959`, kept messages hold no `Read` (two kept messages, a `user` summary and an `assistant` one). Claude Code then re-attaches the five files Claude read whole or wrote: `src/auth/login.ts`, `src/middleware/rateLimit.ts`, `src/config.ts`, `src/db/redis.ts` and `src/auth/sessions.ts` (`prompt.attachment`, `type: 'file'`). The compaction result and the five attachments are the reference recording's own (`fixtures/sessions/reference.ts`, recorded from Claude Code 2.1.296 with `--setting-sources project`, so the prompt is smaller). Spike S1's figures (33,942 to 5,616 tokens) came from an earlier, larger prompt; its captured texts stay in `fixtures/sessions/spike-s1/`.

### Turn 2: "Add a test for the limit."

| Step | Event | What Claude Code returns | Graph afterwards |
| --- | --- | --- | --- |
| 10 | `Write test/login.test.ts` | `type: 'create'`, 7 lines | `login.test.ts` `read`, `created +7`; edges to `login.ts` and `test/helpers.ts`, a ghost |
| 11 | `Read test/helpers.ts` | `text`, whole | `helpers.ts` `read` |
| 12 | F12: `log_decision` "Limit by IP, 5 attempts per minute", files `rateLimit.ts`, `login.ts` | The JSON string `{"logged":true,"id":"D2"}` | decision D2 with two links |
| 13 | `Bash npm test` | exit 1 (`isError`): `ERR_MODULE_NOT_FOUND` for `src/auth/login`, because the sample app's imports have no `.ts` extension; no `src/auth/login.ts:21` in the output | nothing changes: not a search |

### What the recording showed

`fixtures/sessions/reference.ts` follows the story except where this spec now says otherwise: `totalLines` 121, the compaction figures, the five re-attachments, and step 13. Steps 7 and 12 are real tool input, but the answer is a probe-registered tool's: the engine accepts only a string, an array or `undefined` as a plugin tool's result, so `log_decision` answers a JSON string (F12-R4). Step 13 fails because `npm test` cannot load `login.test.ts`; the sample app is not changed. No checkpoint depends on a `path:line` hit from test output (RS-5 only needs that nothing changes), so the "output that looks like a search hit" case of F02-R6 is covered by F02-AC4 alone.

## Checkpoints

The scenario test asserts each checkpoint at the step named, in one test per checkpoint. A checkpoint is part of a milestone's gate only once every feature it needs has shipped: RS-1 and RS-4 from v0.1, RS-2 and RS-3 from v0.3, RS-5 from v0.6.

- **RS-1** After step 3: `routes/index.ts` is `partial` with `seen` "lines 1 to 40 of 121"; `login.ts` is `read` with 2 hits; `password.ts` is `search` with `seen` "2 search hits, never opened".
- **RS-2** After step 8 and its queued work: `api/users.ts` is a `ghost` with a `blind` edge to `login.ts`, and the footer names it; `routes/index.ts` has no blind mark because Claude opened it.
- **RS-3** After step 9: `package.json` and `package-lock.json` are `unread` with `change: blind` and a reason naming the command; `login.ts` and `rateLimit.ts` carry no blind mark.
- **RS-4** After the compaction and the five re-attachments: `routes/index.ts` and `password.ts` are `compacted`, every change mark is kept, `login.ts`, `rateLimit.ts`, `config.ts`, `redis.ts` and `sessions.ts` are `read` again, and one `CompactMark` records 22,694 and 4,959 with `kept: 0` (no read survived in the kept messages; the five came back as attachments).
- **RS-5** After step 13: the graph equals the golden graph below, the timeline holds two snapshots, and replaying them from its base gives the live graph.

## The golden graph

| Path | State | Change | Notes |
| --- | --- | --- | --- |
| `src/routes/index.ts` | `compacted` | | Partial before the compaction |
| `src/auth/login.ts` | `read` | `edited +2 −0` | Re-attached after the compaction |
| `src/auth/password.ts` | `compacted` | | Search hits before the compaction |
| `src/auth/sessions.ts` | `read` | | Re-attached after the compaction |
| `src/db/redis.ts` | `read` | | Re-attached after the compaction |
| `src/config.ts` | `read` | | Re-attached after the compaction |
| `src/middleware/rateLimit.ts` | `read` | `created +12` | Re-attached after the compaction |
| `src/api/users.ts` | `ghost` | | Blind spot: imports `login.ts` |
| `package.json` | `unread` | `blind` | Changed by `npm install rate-limiter-flexible` |
| `package-lock.json` | `unread` | `blind` | Same command |
| `test/login.test.ts` | `read` | `created +7` | |
| `test/helpers.ts` | `read` | | |

Import edges: `routes/index.ts → login.ts`, `login.ts → password.ts`, `login.ts → sessions.ts`, `sessions.ts → redis.ts`, `redis.ts → config.ts`, `login.ts → rateLimit.ts`, `users.ts → login.ts` (blind), `login.test.ts → login.ts`, `login.test.ts → helpers.ts`.

Decision edges (with `decisions: true`): D1 to `rateLimit.ts` and `redis.ts`; D2 to `rateLimit.ts` and `login.ts`.

Memory: `CLAUDE.md` (`Project`) and `src/auth/CLAUDE.md` (nested).

Footer, newest first: `package-lock.json`, `package.json`, `src/api/users.ts`.

## Manual check (whole product)

1. Copy `fixtures/sample-app` to a temporary folder, `git init`, commit everything, and run `claude --plugin-dir <path to this repository>` there, at least 160 columns wide.
2. Run `/graph`, then send "Add rate limiting to the login route. Don't open other files than you need."
3. Watch the pane while Claude works. A blind spot on `src/api/users.ts` appears soon after Claude edits `login.ts`, before the turn ends.
4. Run `/compact`. Older reads turn hollow; the files Claude Code re-attached stay filled.
5. Send "Add a test for the limit." The timeline now has two turns.

## Changelog

- 2026-10-11 Review. First version: a self-contained project, story, checkpoints and golden graph for every scenario test and manual check.
- 2026-10-11 Approved by the owner.
- 2026-10-12 Back to Review: spike S1 showed the engine re-attaches five files after the compaction, not two. The compaction, RS-4 and the golden graph follow the captured session. Approved by the owner.
- 2026-10-12 The recording of the reference session (`fixtures/sessions/reference.ts`, not `.json`) replaces the guesses: `routes/index.ts` has 121 lines, the compaction is 22,694 to 4,959 tokens, the five re-attachments are the recording's own, `log_decision` answers a JSON string, and `npm test` exits 1 with `ERR_MODULE_NOT_FOUND`. Approved by the owner.
