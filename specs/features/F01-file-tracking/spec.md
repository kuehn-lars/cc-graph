# F01 File tracking

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Approved | v0.1 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | F08 (to show it), F15 (agent marks) |

## Problem

The transcript shows that Claude called `Read`, but not whether it got the whole file, a slice, a token-capped first page, or a "file unchanged" note. Edits scroll past with no running total, and files the person `@`-mentioned never show up as tool calls at all. Nobody can say at a glance which files Claude has actually seen.

## Solution

Every file Claude reads, edits, writes or edits as a notebook, and every file the person `@`-mentions, becomes a node with an honest record of what Claude saw: whole, part (and which lines), or only a reference, with an estimated size, a change mark and running line counts.

## User stories

1. As a developer, I want every file Claude read to appear in one place, so that I don't rebuild its reading list from the transcript.
2. As a developer, I want a partial read to say which lines Claude saw, so that I know when it read 40 lines of a 120-line file.
3. As a developer, I want a read cut by the token cap marked as partial, so that a large file Claude only paged into never looks fully read.
4. As a reviewer, I want edited and created files marked with their added and removed line counts, so that I see the size of each change.
5. As a reviewer, I want a file Claude created to stay "created" after later edits, so that new files stand out from changed ones.
6. As a developer, I want files I `@`-mentioned to count as read, so that the pane matches what Claude was given.
7. As a developer, I want denied, failed and staged calls to leave the graph alone, so that the pane only shows what really happened.
8. As a developer, I want images, PDFs and notebooks shown as read with an unknown size, so that the pane admits what it cannot estimate.

## Requirements

- **F01-R1** When a `Read` succeeds with `result.type: 'text'`, the mod sets the node to `read` if `file.startLine` is 1, `file.numLines` is at least `file.totalLines` and `file.truncatedByTokenCap` is not set, and to `partial` otherwise. It sets `tokens` to `ceil(file.content.length / 4)`, `seen` to the range in words ("120 lines", "1 line", "lines 1 to 40 of 120"), and `readId` to the call's `tool_use_id`. A partial read over a node that is already `read` changes none of `state`, `tokens`, `seen` and `readId`: the whole read stays the honest record.
- **F01-R2** When a `Read` succeeds with `result.type` `image`, `pdf`, `parts` or `notebook`, the mod sets the node to `read` with `tokens: null` and a `seen` naming the kind: "image", "PDF", "PDF pages 3 to 7" (from `firstPage` and `file.count`), "notebook, 12 cells". Counts are singular at one: "notebook, 1 cell". When absent, `firstPage` is 1, the page count 1 and the cell count 0.
- **F01-R3** When a `Read` answers `result.type: 'file_unchanged'`, the mod changes no state. A path with no node becomes `read` with `tokens: null` and `seen` "unchanged since an earlier read".
- **F01-R4** When an `Edit` succeeds and `result.staged` is not set, the mod keeps the node's state (a new node starts `partial` with `seen` "only the edited lines"), sets `change: edited` unless the node is `created`, adds the `+` and `-` lines of `result.structuredPatch` to `added` and `removed`, and sets `line` to the first hunk's `newStart`.
- **F01-R5** When a `NotebookEdit` succeeds and `result.error` is not set, the mod does as F01-R4, counting the lines of `result.new_source` as added and of `result.old_source` as removed.
- **F01-R6** When a `Write` succeeds and `result.staged` is not set, the mod sets the node to `read` with `tokens` from `result.content` and `seen` "written by Claude"; sets `change: created` when `result.type` is `'create'`, otherwise `edited` unless the node is already `created` (I2); counts lines from `result.structuredPatch`, or, when the patch is empty and `result.type` is `'create'`, every line of the content (an empty update patch adds nothing: nothing changed, the diff timed out, or the old content was too large); and sets `line` to the first hunk's `newStart`, or 1.
- **F01-R7** When `prompt.mention`'s `next(e)` resolves `type: 'file'` or `'already_read_file'`, a mention changes a node only when it is missing or a `ghost`: the mod then sets the node for `e.path` to `read`, or `partial` when `e.offset` or `e.limit` is set, with `tokens: null` and `seen` "mentioned by you", "lines 10 to 20, mentioned by you", "from line 10, mentioned by you" (`offset` without `limit`) or "lines 1 to 20, mentioned by you" (`limit` without `offset`). On any other node, a `read` or `partial` one included, the mention only updates `lastTurn` and `touched` (R9). For `'pdf_reference'` it adds a `ghost` with `seen` "mentioned PDF, not attached" only when no node exists, and otherwise only updates `lastTurn` and `touched`. For `null` it changes nothing.
- **F01-R8** If a call is refused (`deny`), errored (`isError`) or staged (`result.staged`), then the mod changes nothing.
- **F01-R9** The mod sets `lastTurn` and `touched` (the next `Graph.seq`) on every node it touches, and `firstTurn` on every node it creates, from the current main-loop turn.
- **F01-R10** The mod's hooks return what `next(e)` resolved to, unchanged (equal field for field), and are registered with `.catch(($, e, next) => next(e))` (P1, NFR-R1).
- **F01-R11** The mod takes the path from the call's own input (`file_path`, or `notebook_path` for `NotebookEdit`) or the mention's `e.path`, normalized by I4.

## Acceptance criteria

- **F01-AC1** Given an empty graph, when `Read` of `src/a.ts` returns all 120 lines, then the node is `read`, `seen` is "120 lines" and `tokens` is the content length divided by 4, rounded up.
- **F01-AC2** Given an empty graph, when `Read` returns `startLine: 1`, `numLines: 40`, `totalLines: 120`, then the node is `partial` and `seen` is "lines 1 to 40 of 120".
- **F01-AC3** Given a text `Read` result with `truncatedByTokenCap: true`, then the node is `partial`.
- **F01-AC4** Given `src/a.ts` is `read`, when an `Edit` succeeds, then the node stays `read`, `change` is `edited`, and `added` and `removed` equal the `+` and `-` lines of the written patch (the recorded `replace_all` Edit: 6 and 6).
- **F01-AC5** Given no node for `src/new.ts`, when `Write` returns `type: 'create'` with N lines (the recorded create: 14), then the node is `read`, `change` is `created` and `added` is N.
- **F01-AC6** Given `src/new.ts` is `created`, when an `Edit` changes it, then `change` stays `created`.
- **F01-AC7** Given a `Read` that a `PreToolUse` check denies, then the graph is unchanged and the result the hook returns is the errored result it received.
- **F01-AC8** For every tool call of the reference session, the result the hook returns deep-equals (`toStrictEqual`) the result the handler beneath it returned.
- **F01-AC9** Given the person's prompt mentions `@src/b.ts`, then `src/b.ts` is `read` with `seen` "mentioned by you" and `tokens: null`.
- **F01-AC10** Given the working directory is `/w`, when `Read` of `/w/src/a.ts` and of `/etc/hosts` succeed, then the nodes are `src/a.ts` and `/etc/hosts`.
- **F01-AC11** Given a `Read` of `docs/arch.png` that returns `type: 'image'`, then the node is `read` with `tokens: null` and `seen` "image".
- **F01-AC12** Given `src/a.ts` is `compacted`, when a `Read` of it answers `file_unchanged`, then it stays `compacted`.
- **F01-AC13** Given a `Write` whose result has `staged: true`, then the graph is unchanged.
- **F01-AC14** Given an `Edit` with `replace_all: true` whose patch has several hunks, then `added` and `removed` count the `+` and `-` lines across all hunks (recorded: 3 hunks, +6 −6; a hunk may cover adjacent lines).
- **F01-AC15** Given the mention `@src/b.ts#L10-20` resolves with `offset: 10`, `limit: 11`, then `src/b.ts` is `partial` with `seen` "lines 10 to 20, mentioned by you".
- **F01-AC16** Given a mention that resolves `type: 'pdf_reference'` for `docs/spec.pdf`, then `docs/spec.pdf` is a `ghost` and the meter is unchanged.
- **F01-AC17** Given `src/a.ts` is `read` from a whole `Read`, when a later `Read` of it returns lines 1 to 40 of 120, then the node keeps `read`, `tokens`, `seen` and `readId` of the whole read.
- **F01-AC18** Given `src/b.ts` is `read` or `partial` from a `Read`, when `@src/b.ts#L10-20` resolves with `offset: 10`, `limit: 11`, then `state`, `tokens` and `seen` are unchanged, and `lastTurn` and `touched` are updated.
- **F01-AC19** Given `src/b.ts` is a `ghost`, when `@src/b.ts` resolves `type: 'file'`, then `src/b.ts` is `read`, "mentioned by you".
- **F01-AC20** Given a mention that resolves `type: 'file'` with `offset: 10` and no `limit`, then the node is `partial` with `seen` "from line 10, mentioned by you".
- **F01-AC21** Given a mention that resolves `type: 'file'` with `limit: 20` and no `offset`, then the node is `partial` with `seen` "lines 1 to 20, mentioned by you".
- **F01-AC22** Given `docs/spec.pdf` is `read`, when a mention of it resolves `type: 'pdf_reference'`, then it stays `read` and only `lastTurn` and `touched` change.
- **F01-AC23** Given no node for `src/a.ts`, when a `Read` of it answers `file_unchanged`, then the node is `read` with `tokens: null` and `seen` "unchanged since an earlier read".

## Implementation decisions

- **Actions, not events, reach the model.** The wiring turns each tool result into one action (`fileRead`, `fileEdited`, `fileWritten`, `fileMentioned`) carrying only the fields the reducer needs: path, kind, range, size, patch counts, ids. The `model` never sees an engine type, so reducers stay plain and the tool result shapes are handled in one place.
- **Line counts come from `structuredPatch`.** Counting the lines of `old_string` and `new_string` is wrong for `replace_all` and for edits the person changed in the permission dialog. The patch is what was written.
- **The path comes from the call's input.** Every `Read` result kind echoes the file except `image`, so the input is the one field present on every call.
- **`file_unchanged` changes nothing.** Claude Code told Claude it already has the content, so whatever the node says Claude has is still true. A compacted file answered "unchanged" stays compacted, which is exactly the blind spot the pane exists to show.
- **`seen` is stored, not derived at draw time,** so the card, the list and the timeline show the same words without re-deriving them from facts the node no longer holds.
- **Agent attribution belongs to F15.** F01 records the touch; F15's rule decides `mainLoop` and `agents` for the same action.

## Testing decisions

- **Seam:** the engine test kit. A test raises `$.tool.call({ tool: 'Read', file_path: '/w/src/a.ts' })`; its own `on('tool.call', { tool: 'Read' }, …)` beneath answers with a recorded result; `on('session.start', …)` beneath answers `{ cwd: '/w' }`. Assertions read the `graph` key.
- **Denial:** the test's `classic.PreToolUse` hook answers a deny, which the kit turns into the errored result a session produces (F01-AC7).
- **Pass-through:** F01-AC8 compares, with `toStrictEqual`, what the hook returned with what the test's hook beneath returned, for every call of the reference session. The kit copies results across hooks, so identity cannot be observed; equality catches a dropped, added or rebuilt field.
- **Fixtures:** tool results recorded in `fixtures/sample-app`: a whole, a ranged and a token-capped `Read`, an image, a PDF, a PDF-pages and a notebook `Read`, an `Edit` with `replace_all`, a create and an update `Write`, a `NotebookEdit`.
- **`file_unchanged` is derived.** No session of 2.1.296 returned `file_unchanged` (the engine's dedup killswitch appears to be on), so its test result is derived from the `type: "file_unchanged"` variant of the `Read` result in `.claude-plugin/types/claude-code-tools/index.d.ts` (`{ type: 'file_unchanged', file: { filePath } }`), marked derived in the fixture and the tests. A recording replaces it when a build returns one.
- **Other derived results.** A result a session never returns by itself (a `staged` flag, an error text, an empty patch, a mention result, which carries no tool output) is derived from a recording with the field changed, or from the types, and each such test says so in a comment.
- **A compacted node is seeded.** Only F03 produces `compacted`, so F01-AC12 seeds the graph: the test's own `state.get` hook, beneath the mod, answers the first read of `graph` with a graph holding that node, and passes on every later read.

## Mods API used

| Need | Event or method |
| --- | --- |
| Tool results | `tool.call` with matchers `{ tool: 'Read' }`, `{ tool: 'Edit' }`, `{ tool: 'Write' }`, `{ tool: 'NotebookEdit' }`, after `await next(e)`; `result` typed per tool |
| Call id | `e.tool_use_id` |
| Mentioned files | `prompt.mention` after `next(e)`: input `path`, `offset`, `limit`; result `{ type }` |
| Robustness | `.catch(($, e, next) => next(e))` on every registration |

## Data model changes

Adds `FileNode` with the `read`, `partial` and `ghost` states and the `edited` and `created` changes, and the fields `tokens` (nullable), `seen`, `added`, `removed`, `line`, `readId`, `firstTurn`, `lastTurn`, `touched`, and `Graph.seq`.

## Manual check

1. In a copy of `fixtures/sample-app`, run `claude --plugin-dir <this repository>`, then `/graph list`.
2. Ask Claude to read `src/auth/login.ts` whole and `src/routes/index.ts` lines 1 to 40, then to edit `login.ts` and to create `src/middleware/rateLimit.ts`.
3. Send a prompt mentioning `@src/config.ts`.
4. The list shows four rows with the right glyphs (`●`, `◐`, `●`, `●`), the change badges `edited +n −n` and `created +n`, and "≈tokens · seen" for each.

## Out of scope

- **Files read through the shell** (`cat`, `head`, `sed -n` in `Bash`). Only shell *searches* are tracked (F02). A later spec may parse simple shell reads.
- **Directory listings and globs.** They name files without showing content, and native builds register no `Glob` tool.
- **Files changed by MCP tools.** Their results have no shared shape.

## Open questions

None.

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Checked against the 2.1.296 types. Added the `image`, `pdf`, `parts`, `notebook` and `file_unchanged` result kinds, `staged` results, line counts from `structuredPatch`, ranged and PDF mentions, and turn bookkeeping.
- 2026-10-11 Approved by the owner.
- 2026-10-12 F01-R6: an empty patch counts the content's lines only for a create; an empty update patch adds nothing. Approved by the owner.
- 2026-10-12 Recordings against the spec. AC4, AC5 and AC14 use the recorded numbers (patch counts, 14 lines, +6 −6); AC8 and R10 say deep equality, not identity; R1 keeps `readId` of a whole read; R2 singular counts and defaults; R7 changes only a missing or `ghost` node, adds the `offset`-only and `limit`-only wordings (AC17 to AC23); `file_unchanged` and other results no session returns are derived and marked. Approved by the owner.
