# Changelog

Versions follow semver. Each release names the Claude Code versions it was tested on.

## Unreleased

- Plugin skeleton: `plugin.json`, `marketplace.json`, an empty hooks module, the `$.state` contract (02 Data model) and the Claude Code 2.1.296 types.
- `fixtures/sample-app` (04 Reference session) and real `rg`, `grep` and `git` output in `fixtures/output/`, with `capture.sh` to record it again.
- `scripts/trace.mjs`, `scripts/check-calls.mjs` and CI on Claude Code 2.1.296 and `latest`.
- Spike S0 (ARCH-Q1): off-path `$.clock.after` work may run `git` and write state after its hook returned, and the write redraws the pane.
- Spike S1 (F03-Q1, F07-Q1): `file` attachments after a compaction name the absolute path on their first line; no `edited_text_file` was seen in 2.1.296.
- F01 file tracking: a successful text `Read` becomes a `read` or `partial` node with `seen`, `tokens` and `readId`; paths are relative to the working directory (F01-AC1..AC3, AC7, AC10).
- F01 file tracking: image, PDF, PDF page range and notebook reads become `read` nodes with `tokens: null` and a `seen` naming the kind (F01-AC11, R2). `file_unchanged` is handled too (below).
- F01 file tracking: a successful `Edit` or `NotebookEdit` marks the node `edited` with `+added −removed` counted from the written patch, and keeps its state (F01-AC4, AC14, R4, R5).
- F01 file tracking: a `Write` marks the node `created` or `edited`, and `created` survives later edits and writes; staged writes change nothing (F01-AC5, AC6, AC13, R6).
- F01 file tracking: `@`-mentioned files become `read`, `partial` (ranged) or `ghost` (PDF not attached) nodes; denied mentions change nothing (F01-AC9, AC15, AC16, R7).
- F01 file tracking: the hooks return the tool result unchanged across the recorded reference session (F01-AC8, R10).
- F01 file tracking: `file_unchanged` leaves an existing node as it is (a compacted file stays compacted) and makes a missing one `read`, "unchanged since an earlier read" (F01-R3, AC12, AC23). Its test result is derived from the type, not recorded: no 2.1.296 session returned one.
- F01 file tracking: a mention changes only a missing or `ghost` node, and only touches `lastTurn` and `touched` on any other (F01-R7, AC18..AC22); a partial read keeps the whole read's `readId` (F01-AC17). Recordings now set the numbers of AC4, AC5 and AC14, and AC8 means deep equality.
- Specs follow the reference recording: `fixtures/sessions/reference.ts`, 121 lines for `routes/index.ts`, compaction 22,694 to 4,959 tokens, `log_decision` answers a JSON string (F12-R4), `npm test` exits 1 (04 Reference session). Tests may use results marked derived (CLAUDE.md).
- F08 pane: `/graph` is registered at `session.start` and opens pane `cc-graph` (focused, closes on Esc, 64 columns); one `ui.render` hook matching only that pane draws the Files section, "Nothing read yet." on an empty graph; a pane that waits shows its reason in a toast (F08-AC1, AC7, R1..R3, R12, NFR-R4).
- F08 list view: every file in the graph is one row in Files, newest first: state glyph, path, change badge and "≈tokens · seen" ("≈?" when unknown) (F08-AC2, R5, NFR-A1). AC2 seeds its `search` node until F02 ships.
