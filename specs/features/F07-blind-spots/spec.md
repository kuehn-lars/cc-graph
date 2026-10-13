# F07 Blind spots

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Review | v0.3 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | F01, F06, F08, F14 |

## Problem

Claude edits a function and moves on, never opening the files that call it. A shell command such as `npm install` or a formatter rewrites files Claude never sees. Both are invisible in the transcript, and both are where agent work quietly breaks.

## Solution

Soon after Claude changes a file, while the turn is still running, the pane names the files that import it but were never opened, and the files a shell command changed behind Claude's back. Each blind spot has a one-line reason and, through the card (F11), one key to `@`-mention it into the prompt. Changes the person made that Claude Code did show Claude are marked separately, so they never cry wolf.

## User stories

1. As a developer steering Claude, I want files that import something Claude changed, but that it never opened, flagged as blind spots, so that I can ask Claude to check them.
2. As a developer steering Claude, I want a blind spot to appear while the turn is still running, so that I can interrupt before Claude builds on it.
3. As a reviewer, I want files changed by a shell command marked with the command, so that an `npm install` or a formatter run is never invisible.
4. As a reviewer, I want my own edits that Claude was shown marked differently from changes it never saw, so that the warnings stay meaningful.
5. As a developer, I want the mod to work without `git`, saying what it can't do, so that it never breaks a session outside a repository.
6. As a developer, I want the blind-spot search to cost Claude no time, so that tool calls are as fast as without the mod.
7. As a developer, I want a blind spot to clear once Claude opens the file, so that the list only shows what is still unseen.

## Requirements

- **F07-R1** When `session.start` fires, the mod enqueues `git rev-parse --show-toplevel`. If `git` cannot start or exits non-zero, then F07 is off for the conversation and the footer says "Shell changes need git" once.
- **F07-R2** When a file gets `change` `edited` or `created` (F01), the mod enqueues, at most once per path per main-loop turn, `git grep -n -I --untracked -E -e <pattern> -- <pathspecs>` in the repository root with a 5 second timeout, where the pattern matches an import line (F06-R2 forms) whose quoted specifier ends in the file's name without extension, and the pathspecs cover the JavaScript, TypeScript and Python extensions.
- **F07-R3** The mod confirms each hit by resolving its specifier from the hit's file with F06's rules. Only hits that resolve to the changed path count.
- **F07-R4** When a confirmed importer has no node, the mod adds it as a `ghost` with an import edge to the changed file. An edge from a `ghost` to a changed file is `blind`. When the ghost leaves the `ghost` state, the mod clears `blind` on its edges.
- **F07-R5** The mod keeps a baseline: the paths `git status --porcelain=v1 -z --untracked-files=all` reports as changed or untracked, taken at `session.start`, at each main-loop `turn.start`, and after each `Bash` call.
- **F07-R6** When the status after a `Bash` call (one that ran, failed or not) differs from the baseline, the mod writes, in one update of `graph`, each path it names that the baseline did not, or with other status letters: untracked (`??`), added, or the new path of a rename, `change: created` with `reason` "created by `<command>`"; with a `D`, or the old path of a rename, `change: deleted`, "deleted by `<command>`"; any other, `change: blind`, "changed by `<command>`". An untracked path of the baseline that is gone is `deleted` too. The command is its first line, cut to 60 characters. `deleted` replaces any change; `created` replaces none but `deleted`; `blind` leaves `edited` and `created` alone, so what a Claude tool changed is never blamed on a command. A new node or a `ghost` becomes `unread`; any other node keeps its state.
- **F07-R7** When a main-loop `prompt.attachment` of `type: 'edited_text_file'` names a file, the mod sets `change: external` with `reason` "changed outside Claude; Claude was shown it" if the node has no change, and otherwise keeps the change and sets that reason. An `external` change is not a blind spot. How the path is read from the text is F07-Q1.
- **F07-R8** Every `git` job runs off the hook's return path, one at a time (D5): a tool result never waits for `git` (NFR-P4, NFR-P6).
- **F07-R9** If a `git` job times out or fails, then the mod drops it, writes the reason to the debug log, and the footer says "Blind-spot search timed out" once per conversation.
- **F07-R10** The footer lists blind spots newest first, at most 5, each with a one-line reason: "imports login.ts, never opened" or "changed by `npm install left-pad`".
- **F07-R11** The mod runs `git` only with `rev-parse`, `status` and `grep`, with `GIT_OPTIONAL_LOCKS=0`, and passes paths only after `--` (NFR-S5).
- **F07-R12** While the `blindSpots` setting is off, the mod runs no `git` and shows no Blind spots section.

## Acceptance criteria

- **F07-AC1** Given `src/api/users.ts` imports `../auth/login`, when Claude edits `src/auth/login.ts` without opening `users.ts`, then `users.ts` is a `ghost`, its edge to `login.ts` is `blind`, and the footer names it.
- **F07-AC2** Given `npm install` rewrites `package.json`, then `package.json` has `change: blind`, state `unread`, and a reason naming `npm install`.
- **F07-AC3** Given Claude edited `a.ts` with `Edit`, when a later `git status` shows `a.ts` modified, then `a.ts` gets no blind mark.
- **F07-AC4** Given `git` cannot start, or the folder is not a repository, then nothing reaches the transcript and the footer says "Blind spots need git".
- **F07-AC5** Given `git grep` runs past 5 seconds, then the job is dropped, the `Edit` result Claude received is unaffected, and the footer says "Blind-spot search timed out".
- **F07-AC6** Given an `edited_text_file` attachment for `src/config.ts`, then it has `change: external` and is not listed as a blind spot.
- **F07-AC7** Given two `Edit` calls on `login.ts` in one turn, then `git grep` runs once for it in that turn.
- **F07-AC8** Given an `Edit` of `login.ts`, then the `tool.call` hook has returned before the first `process.run` is raised.
- **F07-AC9** Given `git grep` reports `src/admin/panel.ts` with `import { x } from './login'`, then no edge to `src/auth/login.ts` is added, because the specifier resolves to `src/admin/login.ts`.
- **F07-AC10** Given `README.md` became modified between two turns, when the second turn runs `npm test`, then `README.md` gets no blind mark.
- **F07-AC12** Given `git status` shows `?? src/middleware/rateLimit.ts` after a `Bash` call and not before, then `src/middleware/rateLimit.ts` has `change: created`, state `unread`, and a reason naming the command.
- **F07-AC13** Given the status before a `Bash` call is the one after `npm install`, and after it shows ` D test/helpers.ts` and the rename `R  src/db/store.ts` from `src/db/redis.ts`, then `test/helpers.ts` and `src/db/redis.ts` have `change: deleted` with the reason "deleted by `<command>`", and `src/db/store.ts` has `change: created`; a `read` node keeps its state.
- **F07-AC14** Given `docs-1.md` untracked in the baseline, when a `Bash` call leaves it out of the status, then it has `change: deleted`.
- **F07-AC15** Given `git rev-parse` exits non-zero, then a `Bash` call runs no `git status`, and the footer says "Shell changes need git" once.
- **F07-AC11** Given `users.ts` is a blind-spot ghost, when Claude reads it, then its edge is no longer `blind` and the footer no longer names it.

## Implementation decisions

- **Off-path queue.** The `tool.call` hook only enqueues; the queue (01 Architecture) runs one `git` process at a time, so neither a slow repository nor a hung `git` can delay Claude.
- **Search right after the change, not at the end of the turn.** A blind spot is most useful while Claude is still working, when the person can still interrupt. "Once per path per turn" keeps repeated edits cheap.
- **`git grep`, then confirm.** `git grep` is fast and reads only the repository's own files; the regular expression is deliberately loose, and resolving each hit with F06's rules removes the false matches (another `login.ts`, a comment).
- **Baseline at `turn.start`.** People edit files between turns. Refreshing the baseline when a turn starts means those edits are never blamed on the next shell command.
- **Change precedence.** `blind` replaces any change, because it is the one the person must notice. `external` never hides Claude's own `edited` or `created`; it only adds the reason.
- **Known limit.** A file that was already changed before a shell command, and that the command changes again, looks the same to `git status` before and after, so it is not flagged. Spike S4 (F07-Q2) looks at the engine's own per-command change list, which would close this gap.
- **Paths.** `git` reports paths relative to the repository root; the mod rewrites them relative to the working directory (I4), which may be a subfolder.

## Testing decisions

- **Seam:** the engine test kit. The test's own `on('process.run', …)` beneath stands in for `git`: it answers recorded `rev-parse`, `status` and `grep` output from `fixtures/output/`, can throw (no `git`) or wait on the mocked clock past 5 seconds (F07-AC5), and counts calls (F07-AC7).
- F07-AC8 records the order of the `tool.call` return and the first `process.run` in the test's hooks.
- **Secondary seam:** unit tests for the porcelain `-z` parser, the `git grep` line parser and the pattern builder (special characters in file names are escaped).
- The blind-spot scenario also runs in the reference session (RS-2, RS-3) against a real temporary repository in the manual check.

## Mods API used

| Need | Event or method |
| --- | --- |
| `git` | `$.process.run(['git', …], { cwd, timeoutMs: 5000, env: { GIT_OPTIONAL_LOCKS: '0' } })` → `{ exitCode, stdout, stderr }`; rejects when `git` cannot start or runs past the timeout |
| Repository root | `git rev-parse --show-toplevel` |
| Shell changes | `tool.call` with `{ tool: 'Bash' }`, after `await next(e)`: `e.command` |
| Baseline points | `session.start`, `turn.start` |
| Outside edits Claude was shown | `prompt.attachment` with `type: 'edited_text_file'` (text only) |
| Off-path work | `$.clock.after` (ARCH-Q1) |

## Data model changes

Adds the `blind` and `external` changes, `FileNode.reason`, the `unread` state, `Edge.blind`, and the `notes` key.

## Manual check

1. Copy `fixtures/sample-app` to a temporary folder, `git init` and commit it, then run `claude --plugin-dir <this repository>` there.
2. Ask Claude to add a parameter to `verify()` in `login.ts` without reading other files. Before the turn ends, the footer names `src/api/users.ts`.
3. Ask Claude to run `npm install left-pad`. `package.json` shows the red ring and "changed by `npm install left-pad`".
4. Edit `src/config.ts` yourself in an editor, then send a prompt. It shows the grey `external` ring and is not listed as a blind spot.
5. Run the same session outside a repository: the footer says "Blind spots need git" and nothing else changes.

## Out of scope

- Call-level analysis (which callers use the changed signature). That is code intelligence, a non-goal.
- Files outside the repository and files `git` ignores.
- Changes made by other processes while no `Bash` call runs; F07-R7 covers the ones Claude Code shows Claude.

## Open questions

- [ ] **F07-Q1** Does the `edited_text_file` attachment's text name the path in a stable form? If not, the mod matches the text against known nodes. Spike S1 records real attachments next to F03's. Not observed in spike S1 ([spike-s1.md](../F03-context-layer/spike-s1.md)): a file read whole and then changed outside Claude raised no `edited_text_file` in 2.1.296, headless or interactive, and the transcript held none either. F07-R7 is unconfirmed until a run shows the attachment. Untried: a connected IDE, a change other than an append, a file read with a range.
- [ ] **F07-Q2** Can the `Bash` result's per-command change list (`bashEditDiff.changedFiles`, typed `@internal` in 2.1.296, "for rendering and for PostToolUse Bash hooks") replace the `git status` baseline? It would catch re-changed files and need no `git`. Spike S4: record it for `npm install`, a formatter and `rm` in `fixtures/sample-app`, then decide; an internal field is only used behind a fallback.

## Changelog

- 2026-10-11 Draft. Adds `edited_text_file`, verified as a `prompt.attachment` type in 2.1.296.
- 2026-10-11 Review. Added the repository-root step, hit confirmation, clearing blind edges, baseline refresh at `turn.start`, change precedence, the off-path queue, the timeout note, the `blindSpots` switch, and the known re-change limit with spike S4.
- 2026-10-12 F07-Q1 stays open: spike S1 saw no `edited_text_file`, so F07-R7 is unconfirmed in 2.1.296.
- 2026-10-13 Shell changes pulled into v0.2 at the owner's request, after the F09 manual check showed files Claude created and deleted with `rm` and `printf >` missing from the graph: R1 says "Shell changes need git"; R6 tells a command's creations and deletions from other changes (`created`, `deleted`, `blind`), counts an untracked file gone as deleted, and leaves Claude's own changes alone; AC12 to AC15 added. R1, R5, R6 and R8 ship with v0.2 as ticket 01; the import search (R2 to R4), the attachment (R7), the timeout note (R9), the footer list (R10) and the `blindSpots` switch (R12) stay with v0.3. Back to Review.
