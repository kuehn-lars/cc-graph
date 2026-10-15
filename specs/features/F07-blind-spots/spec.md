# F07 Blind spots

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Approved | v0.3 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | F01, F02, F06, F08, F14, F15 |

## Problem

Claude edits a function and moves on, never opening the files that call it. A shell command such as `npm install` or a formatter rewrites files Claude never sees. Both are invisible in the transcript, and both are where agent work quietly breaks.

More and more of Claude's work goes through the shell. Claude Code's auto mode tells Claude to read with `cat`, `head` or `sed -n` and to make small edits with `sed` and heredocs. Skills such as `implement-spec` run subagents in their own worktrees, then commit and merge their work. The pane misses most of this (spike S4). A file read with `cat` never shows. A file Claude wrote and then removed with `rm` stays "created". A deletion committed in the same command, or files a merge brings in, never show. A file deleted in a subagent's worktree never shows, and the worktree folder itself appears as a new file. A commit can even read as a deletion. Edits Claude made deliberately with `sed -i` show in red as "changed unseen", so the real warnings get lost among them.

## Solution

Soon after Claude changes a file, while the turn is still running, the pane names the files that import it but were never opened, and the files a shell command changed behind Claude's back. Each blind spot has a one-line reason and, through the card (F11), one key to `@`-mention it into the prompt. Changes the person made that Claude Code did show Claude are marked separately, so they never cry wolf.

What Claude does through the shell counts as much as what it does through its tools. A file Claude prints with `cat`, `head` or `sed -n` is read. A file a command names and changes is Claude's own edit, not a blind spot. Deletions show however they happen: after Claude's own `Write`, in the same command as a commit, through a merge, or in a subagent's worktree. Only what Claude has not seen is red.

## User stories

1. As a developer steering Claude, I want files that import something Claude changed, but that it never opened, flagged as blind spots, so that I can ask Claude to check them.
2. As a developer steering Claude, I want a blind spot to appear while the turn is still running, so that I can interrupt before Claude builds on it.
3. As a reviewer, I want files changed by a shell command marked with the command, so that an `npm install` or a formatter run is never invisible.
4. As a reviewer, I want my own edits that Claude was shown marked differently from changes it never saw, so that the warnings stay meaningful.
5. As a developer, I want the mod to work without `git`, saying what it can't do, so that it never breaks a session outside a repository.
6. As a developer, I want the blind-spot search to cost Claude no time, so that tool calls are as fast as without the mod.
7. As a developer, I want a blind spot to clear once Claude opens the file, so that the list only shows what is still unseen.
8. As a developer using auto mode, I want files Claude prints with `cat`, `head`, `tail`, `nl` or `sed -n` shown as read, so that the pane agrees with what Claude actually saw.
9. As a developer, I want a file deleted by a shell command shown as deleted even when Claude wrote it moments before, so that the pane never shows a file that is gone.
10. As a developer, I want deletions and new files that arrive through a commit, a merge or a checkout shown, so that a `git rm … && git commit` or a merge of a subagent's branch is never invisible.
11. As a developer, I want a commit never to read as a deletion, so that the warnings stay meaningful.
12. As a developer running skills that start subagents in worktrees, I want what a subagent's shell commands change in its worktree shown on the same files, so that parallel work stays visible.
13. As a reviewer, I want a file a command names and changes (`sed -i … login.ts`, `cat > new.ts`) shown as Claude's own edit, and only files the command did not name shown as changed unseen, so that red means unseen.
14. As a developer, I want read-only shell commands to cost no `git` call, so that a session of many `cat` and `rg` calls stays as fast as without the mod.

## Requirements

- **F07-R1** When `session.start` fires, the mod enqueues `git rev-parse --show-toplevel`. If `git` cannot start or exits non-zero, then F07 is off for the conversation and the footer says "Shell changes need git" once.
- **F07-R2** When a file gets `change` `edited` or `created` (F01), the mod enqueues, at most once per path per main-loop turn, `git grep -n -I --untracked -E -e <pattern> -- <pathspecs>` in the repository root with a 5 second timeout, where the pattern matches an import line (F06-R2 forms) whose quoted specifier ends in the file's name without extension, and the pathspecs cover the JavaScript, TypeScript and Python extensions.
- **F07-R3** The mod confirms each hit by resolving its specifier from the hit's file with F06's rules. Only hits that resolve to the changed path count.
- **F07-R4** When a confirmed importer has no node, the mod adds it as a `ghost` with an import edge to the changed file. An edge from a `ghost` to a changed file is `blind`. When the ghost leaves the `ghost` state, the mod clears `blind` on its edges.
- **F07-R5** The mod keeps a baseline: the paths `git status --porcelain=v1 -z --untracked-files=all` reports as changed or untracked, taken at `session.start`, at each main-loop `turn.start`, and after each `Bash` call.
- **F07-R6** When the status after a `Bash` call (one that ran, failed or not) differs from the baseline, the mod writes, in one update of `graph`, each path it names that the baseline did not, or with other status letters: untracked (`??`), added, or the new path of a rename, `change: created` with `reason` "created by `<command>`"; with a `D`, or the old path of a rename, `change: deleted`, "deleted by `<command>`"; any other, `change: blind`, "changed by `<command>`" (or `edited`, R17). An untracked path of the baseline that is gone is `deleted` too, unless R14 finds it committed. The command is its first line, cut to 60 characters. `deleted` replaces any change; `created` replaces none but `deleted`; `blind` leaves `edited` and `created` alone, so what a Claude tool changed is never blamed on a command. A new node or a `ghost` becomes `unread`; any other node keeps its state.
- **F07-R7** When a main-loop `prompt.attachment` of `type: 'edited_text_file'` names a file, the mod sets `change: external` with `reason` "changed outside Claude; Claude was shown it" if the node has no change, and otherwise keeps the change and sets that reason. An `external` change is not a blind spot. How the path is read from the text is F07-Q1.
- **F07-R8** Every `git` job runs off the hook's return path, one at a time (D5): a tool result never waits for `git` (NFR-P4, NFR-P6).
- **F07-R9** If a `git` job times out or fails, then the mod drops it, writes the reason to the debug log, and the footer says "Blind-spot search timed out" once per conversation.
- **F07-R10** The footer lists blind spots newest first, at most 5, each with a one-line reason: "imports login.ts, never opened" or "changed by `npm install left-pad`".
- **F07-R11** The mod runs `git` only with `rev-parse`, `status`, `grep` and `diff --name-status`, with `GIT_OPTIONAL_LOCKS=0`, and passes paths only after `--` (NFR-S5).
- **F07-R12** While the `blindSpots` setting is off, the mod runs no `git`: no shell changes, no import search, and no Blind spots section. Shell reads (R19) need no `git` and stay.
- **F07-R13** When a `Write`, `Edit` or `NotebookEdit` changes a file, the mod enqueues a refresh of the baseline (R5) of the tree the file is in, at most one waiting per tree. A file under `.claude/worktrees/agent-‹id›/` is in that worktree's tree (R16); if `git` cannot run there, nothing is refreshed. A file Claude wrote that a later command removes is then `deleted` (spike S4, step 2).
- **F07-R14** The mod takes `HEAD` (`git rev-parse HEAD`; none in a repository without commits) with each status of R5 and R6. When `HEAD` after a `Bash` call differs from the baseline's, the mod also runs `git diff --name-status -z --no-renames <old> <new>` and writes its paths in the same update of `graph` as R6: `D` `deleted` with "deleted by `<command>`", unless the baseline already holds the path as deleted (an earlier command's deletion keeps its reason); `A` `created`, and any other letter `blind` (or `edited`, R17), only for a path the baseline does not hold. An untracked path of the baseline that the diff adds was committed, not deleted. When the baseline has no `HEAD` and the command made the first commit, no diff runs (there is nothing to diff against), and every untracked path of the baseline that is gone was committed, not deleted.
- **F07-R15** The mod skips every path under `.claude/worktrees/` in the working tree's status and diff: it is an agent's worktree, not a file of the project (F15-R9).
- **F07-R16** When a `Bash` call carries `agentId` and is not read-only (R18), the mod runs R6's status, and R14's `HEAD` and diff, in `‹cwd›/.claude/worktrees/agent-‹agentId›` (spike S4), and, if `git` cannot run there, in the working tree. Each worktree keeps its own baseline, which starts empty with no `HEAD` (a new worktree is clean). A path found there names the working tree's node (F15-R9), and its reason ends "in worktree agent-‹agentId›"; a path found in the working tree after the fallback has no such ending. F15-R9's rule that a worktree change leaves `reason` `null` is for the tools' edits: a shell reason always names the command, and a deletion replaces any change (R6).
- **F07-R17** When a word of the command resolves to the changed path, or to a folder that holds it, the command named it. Words resolve as in F02-R8: from the working directory, or from the folder of a `cd … &&` before them. A change R6 or R14 would write as `blind` is then `edited`, with `reason` "changed by `<command>`" and `added` and `removed` left as they are, and the precedence of R6 stays the same. A named change is not a blind spot, and the pane shows an `edited` node with no counted lines as "edited", without counts.
- **F07-R18** If a `Bash` call's result carries `isReadOnly`, then the mod runs no `git` for it: the call changed no file (spike S4).
- **F07-R19** When a `Bash` call returns without `isError` and was not `interrupted`, each of its segments (split as F02 splits them) whose command is `cat`, `bat`, `nl`, `head`, `tail` or `sed -n`, and whose output is not piped into another command, reads its file operands, resolved as in F02-R8. The mod applies F01-R1's rules to each, with the call's `tool_use_id` as `readId`:
  - `cat`, `bat` and `nl` give `read` with `seen` "‹n› lines"; `head -n ‹n›` gives `partial` "first ‹n› lines", `tail -n ‹n›` gives `partial` "last ‹n› lines", `sed -n '‹a›,‹b›p'` gives `partial` "lines ‹a› to ‹b›", and any other form of these gives `partial` "through `‹command›`". When the call reads more than one file, or holds another segment that prints (a `cd` does not), the output cannot be split by file, so `cat`, `bat` and `nl` give `read` with `seen` "through `‹command›`" too.
  - A result Claude Code persisted (`persistedOutputPath`) is `partial` with `seen` "preview only".
  - When the call reads one file and has no other segment that prints, `tokens` is estimated from what Claude read (`text`) and F06 takes import candidates from it. Otherwise `tokens` is null.
  - A call that both searches (F02) and reads changes `graph` once (I9).
  - Shell reads need no `git`: neither R1 nor R12 turns them off.

## Acceptance criteria

- **F07-AC1** Given `src/api/users.ts` imports `../auth/login`, when Claude edits `src/auth/login.ts` without opening `users.ts`, then `users.ts` is a `ghost`, its edge to `login.ts` is `blind`, and the footer names it.
- **F07-AC2** Given `npm install` rewrites `package.json`, then `package.json` has `change: blind`, state `unread`, and a reason naming `npm install`.
- **F07-AC3** Given Claude edited `a.ts` with `Edit`, when a later `git status` shows `a.ts` modified, then `a.ts` gets no blind mark.
- **F07-AC4** Given `git` cannot start, or the folder is not a repository, then nothing reaches the transcript and the footer says "Shell changes need git" (R1).
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
- **F07-AC16** Given a clean baseline, when Claude writes `notes/draft.md` with `Write` and a later `Bash` call runs `rm notes/draft.md`, then `notes/draft.md` has `change: deleted` with the reason "deleted by `rm notes/draft.md`".
- **F07-AC17** Given the status is clean before and after `git rm -q test/helpers.ts && git commit -qm "drop helpers"`, and `HEAD` moved with the diff `D test/helpers.ts`, then `test/helpers.ts` has `change: deleted` with a reason naming the command.
- **F07-AC18** Given a merge moves `HEAD` and the diff names `A side.txt`, then `side.txt` has `change: created`, state `unread`, and a reason naming the command.
- **F07-AC19** Given `?? notes/b.md` in the baseline, when `git add notes/b.md && git commit -qm b` moves `HEAD` and the diff names `A notes/b.md`, then `notes/b.md` is not `deleted`.
- **F07-AC20** Given the status after a `Bash` call shows `?? .claude/worktrees/agent-a279be1fce34363f9/`, then no node is added for it.
- **F07-AC21** Given subagent `a279be1fce34363f9` runs `rm src/routes/index.ts`, and `git status` in `.claude/worktrees/agent-a279be1fce34363f9` shows ` D src/routes/index.ts`, then `src/routes/index.ts` has `change: deleted` with the reason "deleted by `rm src/routes/index.ts` in worktree agent-a279be1fce34363f9", and no `git status` runs in the working tree for that call.
- **F07-AC22** Given `printf '// probe\n' >> src/db/redis.ts` leaves ` M src/db/redis.ts`, then `src/db/redis.ts` has `change: edited` with a reason naming the command and is not listed as a blind spot; given `npm pkg set description=probe` leaves ` M package.json`, then `package.json` has `change: blind`.
- **F07-AC23** Given a `Bash` call `cat src/auth/login.ts` whose result carries `isReadOnly`, then no `process.run` is raised for it.
- **F07-AC24** Given `cat src/auth/login.ts` returns the file's 48 lines, then `src/auth/login.ts` is `read` with `seen` "48 lines", `tokens` estimated from the output, and the call's `tool_use_id` as `readId`.
- **F07-AC25** Given `sed -n '1,5p' src/config.ts`, then `src/config.ts` is `partial` with `seen` "lines 1 to 5"; given `cat src/config.ts | grep port`, then no read of `src/config.ts` is recorded.
- **F07-AC26** Given `blindSpots: false`, when Claude edits `login.ts` and runs `npm pkg set description=probe` and `cat src/auth/login.ts`, then no `process.run` is raised, the footer has no Blind spots section, and `src/auth/login.ts` has state `read`.
- **F07-AC27** Given a repository without commits and `?? notes/b.md` in the baseline, when `git add notes/b.md && git commit -qm b` makes the first commit, then no `git diff` runs and `notes/b.md` is not `deleted`.

## Implementation decisions

- **Off-path queue.** The `tool.call` hook only enqueues; the queue (01 Architecture) runs one `git` process at a time, so neither a slow repository nor a hung `git` can delay Claude.
- **Search right after the change, not at the end of the turn.** A blind spot is most useful while Claude is still working, when the person can still interrupt. "Once per path per turn" keeps repeated edits cheap.
- **`git grep`, then confirm.** `git grep` is fast and reads only the repository's own files; the regular expression is deliberately loose, and resolving each hit with F06's rules removes the false matches (another `login.ts`, a comment).
- **Baseline at `turn.start`.** People edit files between turns. Refreshing the baseline when a turn starts means those edits are never blamed on the next shell command.
- **Change precedence.** `blind` replaces any change, because it is the one the person must notice. `external` never hides Claude's own `edited` or `created`; it only adds the reason.
- **Known limit.** A file that was already changed before a shell command, and that the command changes again, looks the same to `git status` before and after, so it is not flagged. Spike S4 (F07-Q2) found the engine's per-command change list empty in `claude -p`, so the limit stays. It matters least for a file Claude changed itself, which is already marked.
- **`git` stays the source of truth (spike S4).** `bashEditDiff`, `gitOperation` and `staleReadFileStateHint` are typed, but none arrived in a recorded session, and two of them are `@internal`. The mod reads none of them, so a later build that fills them changes nothing.
- **Refresh after Claude's own changes (R13).** The baseline used to be taken only at turn starts and after `Bash` calls, so a file Claude wrote in between and a command then removed was in neither status. One coalesced refresh per tree costs a `git status` per burst of edits, not per edit.
- **`HEAD`, not the status, for commits (R14).** `git status` cannot see a change that a command both makes and commits, or that a merge or checkout brings in. Comparing `HEAD` costs one `rev-parse` per status and a `diff` only when `HEAD` moved. `--no-renames` keeps the parse to `A`, `D` and `M`. A diff may name many files (a checkout of a distant branch); I5 then lets the cap be exceeded and says so in the footer, as it does for a large formatter run.
- **Worktrees by name (R15, R16).** No event carries an agent's `cwd`, and spike S4 recorded `.claude/worktrees/agent-‹agentId›` twice. Trying that folder first, and the working tree when `git` cannot run there, needs no second hook. A non-worktree agent pays one failed spawn per writing command, and its read-only commands pay nothing (R18). ponytail: worktree path by naming convention; read it from an event if one ever carries the agent's `cwd`.
- **Named changes are Claude's own (R17).** Auto mode makes `sed -i`, `printf >>` and heredocs ordinary edits. A command that names the file shows what Claude meant to change, so only files the command never named, like `package.json` under `npm install`, stay `blind`. A word that names a folder covers what is in it, so `rm -rf tickets/` names every ticket. `added` and `removed` are not counted from a shell edit: the pane shows "edited" without counts.
- **Shell reads live here, not in F01 (R19).** A blind spot is a file Claude has not seen, so F07 has to know what Claude saw through the shell too: a ghost Claude printed with `cat` is no blind spot. F02 already splits `Bash` commands into segments and resolves `cd`. Shell reads reuse that splitter, which becomes a shared parse module. Only the commands that print a file are read; a piped `cat` is not, since Claude saw only what came out of the pipe. Tokens are estimated only when the whole output belongs to one file.
- **Read-only calls skip `git` (R18).** Most `Bash` calls in a session are reads and searches. `isReadOnly` is the engine's own permission check, so trusting it costs nothing and keeps NFR-P6's count low.
- **Paths.** `git` reports paths relative to the repository root; the mod rewrites them relative to the working directory (I4), which may be a subfolder.

## Testing decisions

- **Seam:** the engine test kit. The test's own `on('process.run', …)` beneath stands in for `git`: it answers recorded `rev-parse`, `status` and `grep` output from `fixtures/output/`, can throw (no `git`) or wait on the mocked clock past 5 seconds (F07-AC5), and counts calls (F07-AC7).
- F07-AC8 records the order of the `tool.call` return and the first `process.run` in the test's hooks.
- The `process.run` stand-in also answers `rev-parse HEAD` and `diff --name-status`, and answers `status` by `cwd`, so one test can hold a working tree and a worktree (F07-AC21). `HEAD` values and diffs are derived from the spike S4 steps; the statuses are captured from a copy of the sample app, as `fixtures/output/` already is.
- Shell reads (F07-AC24, AC25) use `Bash` results captured from a real run into `fixtures/tool-results/` (`cat src/auth/login.ts`, `sed -n '1,5p' src/config.ts`), not typed by hand.
- **Secondary seam:** unit tests for the porcelain `-z` parser, the `git grep` line parser, the pattern builder (special characters in file names are escaped), the `--name-status -z` parser, and the shell-read parser (which segment reads which file).
- The blind-spot scenario also runs in the reference session (RS-2, RS-3) against a real temporary repository in the manual check.

## Mods API used

| Need | Event or method |
| --- | --- |
| `git` | `$.process.run(['git', …], { cwd, timeoutMs: 5000, env: { GIT_OPTIONAL_LOCKS: '0' } })` → `{ exitCode, stdout, stderr }`; rejects when `git` cannot start or runs past the timeout |
| Repository root | `git rev-parse --show-toplevel` |
| Commits, merges, checkouts | `git rev-parse HEAD`; `git diff --name-status -z --no-renames <old> <new>` |
| Shell changes | `tool.call` with `{ tool: 'Bash' }`, after `await next(e)`: `e.command`, `e.agentId`; the result's `isReadOnly`, `isError` |
| Shell reads | the same call: `text` (what Claude read), `result.persistedOutputPath` |
| Claude's own changes (baseline refresh) | `tool.call` for `Write`, `Edit` and `NotebookEdit`, after `await next(e)` |
| Baseline points | `session.start`, `turn.start` |
| Outside edits Claude was shown | `prompt.attachment` with `type: 'edited_text_file'` (text only) |
| Off-path work | `$.clock.after` (ARCH-Q1) |

## Data model changes

Adds the `blind` and `external` changes, `FileNode.reason`, the `unread` state, `Edge.blind`, and the `notes` key. Shell reads and named shell edits use existing fields: a shell read is a `read` or `partial` node as F01 makes, and a named edit is `edited` with `added` and `removed` unchanged.

## Manual check

1. Copy `fixtures/sample-app` to a temporary folder, `git init` and commit it, then run `claude --plugin-dir <this repository>` there.
2. Ask Claude to add a parameter to `verify()` in `login.ts` without reading other files. Before the turn ends, the footer names `src/api/users.ts`.
3. Ask Claude to run `npm install left-pad`. `package.json` shows the red ring and "changed by `npm install left-pad`".
4. Edit `src/config.ts` yourself in an editor, then send a prompt. It shows the grey `external` ring and is not listed as a blind spot.
5. Run the same session outside a repository: the footer says "Shell changes need git" and nothing else changes.
6. Ask Claude to `cat src/auth/sessions.ts` and `sed -n '1,10p' src/db/redis.ts`. Both show as read, the second as lines 1 to 10.
7. Ask Claude to write `notes/draft.md`, then remove it with `rm`. It shows as deleted.
8. Ask Claude to `git rm test/helpers.ts` and commit in one command, then to merge a branch that adds a file. The first shows as deleted, the second as created; a file Claude wrote and then committed is not deleted.
9. Ask Claude to `sed -i` a line in `src/config.ts`. It shows as edited, not as changed unseen.
10. Ask Claude to start a worktree subagent that removes `src/routes/index.ts`. It shows as deleted "in worktree agent-…", and no `.claude/worktrees/…` node appears.
11. In an interactive session, check the probe from spike S4 against the same steps: if `bashEditDiff` appears there, note it in the spike.

## Out of scope

- Call-level analysis (which callers use the changed signature). That is code intelligence, a non-goal.
- Files outside the repository and files `git` ignores.
- Changes made by other processes while no `Bash` call runs; F07-R7 covers the ones Claude Code shows Claude.
- A background command (`run_in_background`): what it changes after the call returns is named by the next writing command's status.
- Files `git` ignores (`node_modules/`, a gitignored `.scratch/`), even ones Claude wrote: a later `rm` of them is not seen.
- Line counts for shell edits, reads through a pipe (`cat a | grep x`), and shell reads by commands other than `cat`, `bat`, `nl`, `head`, `tail` and `sed -n`.
- `git stash` and `git stash pop` leave `HEAD` where it was. What they revert or bring back shows only through the status (R6).

## Open questions

- [ ] **F07-Q1** Does the `edited_text_file` attachment's text name the path in a stable form? If not, the mod matches the text against known nodes. Spike S1 records real attachments next to F03's. Not observed in spike S1 ([spike-s1.md](../F03-context-layer/spike-s1.md)): a file read whole and then changed outside Claude raised no `edited_text_file` in 2.1.296, headless or interactive, and the transcript held none either. F07-R7 is unconfirmed until a run shows the attachment. Untried: a connected IDE, a change other than an append, a file read with a range. Not blocking: R7 alone waits on it, and it ships with v0.3.
- [x] **F07-Q2** Can the `Bash` result's per-command change list (`bashEditDiff.changedFiles`, typed `@internal` in 2.1.296, "for rendering and for PostToolUse Bash hooks") replace the `git status` baseline? It would catch re-changed files and need no `git`. Answered 2026-10-15 by spike S4 ([spike-s4.md](spike-s4.md)) on 2.1.300: no. `bashEditDiff`, `gitOperation` and `staleReadFileStateHint` were absent from every `Bash` result of a `claude -p` session, including `rm`, `sed -i`, a heredoc, `npm pkg set`, a commit and a merge. Decided: the `git` baseline stays, and R13 to R16 close the gaps the spike found. An interactive session is untried (manual check step 11).

## Changelog

- 2026-10-11 Draft. Adds `edited_text_file`, verified as a `prompt.attachment` type in 2.1.296.
- 2026-10-11 Review. Added the repository-root step, hit confirmation, clearing blind edges, baseline refresh at `turn.start`, change precedence, the off-path queue, the timeout note, the `blindSpots` switch, and the known re-change limit with spike S4.
- 2026-10-12 F07-Q1 stays open: spike S1 saw no `edited_text_file`, so F07-R7 is unconfirmed in 2.1.296.
- 2026-10-13 Shell changes pulled into v0.2 at the owner's request, after the F09 manual check showed files Claude created and deleted with `rm` and `printf >` missing from the graph: R1 says "Shell changes need git"; R6 tells a command's creations and deletions from other changes (`created`, `deleted`, `blind`), counts an untracked file gone as deleted, and leaves Claude's own changes alone; AC12 to AC15 added. R1, R5, R6 and R8 ship with v0.2 as ticket 01; the import search (R2 to R4), the attachment (R7), the timeout note (R9), the footer list (R10) and the `blindSpots` switch (R12) stay with v0.3. Back to Review.
- 2026-10-13 Approved by the owner. F07-Q1 and Q2 marked not blocking: R7 waits on Q1 and ships with v0.3, and Q2 would only replace the baseline R5 and R6 already define. Shell changes (R1, R5, R6, R8, R11; AC2, AC12 to AC15) ship with v0.2; the rest with v0.3.
- 2026-10-13 Ticket 01 (shell changes): manual check walked by the owner and approved; ticket deleted. The spec stays Approved until the rest ships with v0.3.
- 2026-10-15 Back to Review. The owner saw reads, changes and deletions missing while using skills, and spike S4 showed why. Added R13 (refresh after Claude's own changes), R14 (`HEAD` and `git diff` for commits, merges and checkouts; a commit is never a deletion), R15 and R16 (agent worktrees), R17 (a change the command names is Claude's own edit), R18 (read-only calls skip `git`) and R19 (shell reads, moved here from F01's out of scope), with AC16 to AC26 and manual check steps 6 to 11. R6, R11 and R12 follow. AC4 and manual check step 5 now name the note R1 defines. F07-Q2 closed: the `git` baseline stays.
- 2026-10-15 Approved by the owner, with the tickets.
- 2026-10-15 R19 says what `seen` is when the output cannot be split by file (several operands or another segment that prints: "through `‹command›`") and for a persisted result ("preview only"). Found while implementing ticket 02; no requirement changes.
- 2026-10-15 R19 says an interrupted call reads nothing, as F02-R7 does for a search. Found in review of ticket 02; the code already did.
- 2026-10-15 R14 and AC27: the first commit of a repository has no old `HEAD` to diff, so untracked paths that leave the status then count as committed, not deleted. Found reviewing ticket 04; fixed at the owner's request, and the status stays Approved.
- 2026-10-15 R13 names the worktree of a subagent's `Write` or `Edit`, and R16 says a fallback to the working tree carries no worktree ending and that F15-R9's null `reason` is for the tools' edits. Found in review of ticket 06; the code already did the second.
