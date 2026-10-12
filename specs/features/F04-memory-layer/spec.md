# F04 Memory layer

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Verified | v0.1 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | F08 |

## Problem

Claude works under instruction files: the project and user `CLAUDE.md`, local and managed ones, auto memory, and nested `CLAUDE.md` files that load when Claude reads inside their folder. Nothing in view says which of them are in force right now, or when a new one arrived in the middle of a turn.

## Solution

The memory files in Claude's context appear in their own section and cluster, each with its type, path and estimated size. A nested file appears the moment Claude Code loads it, with the reason it was loaded.

## User stories

1. As a developer, I want the memory files in context listed with their type and size, so that I know which instructions are in force.
2. As a developer, I want a nested `CLAUDE.md` to appear the moment it loads, with why, so that I see new instructions arriving mid-turn.
3. As a developer, I want memory files kept apart from the files Claude read, so that instruction size and code size are not mixed up.
4. As a developer, I want a memory file that left the context to disappear, so that the list stays true.
5. As a privacy-minded developer, I want memory sizes estimated locally, so that showing them never sends a request.

## Requirements

- **F04-R1** When `session.start` fires, and when `session.measure` reports `context` among `changed`, the mod calls `$.session.usage({ breakdown: 'summary' })` and replaces the notes it lists with one note per entry of `context.breakdown.memoryFiles` (path normalized by I4, `type`, `tokens`), keeping the `reason` of a note it already had. A note whose `reason` is "nested", "path rule" or "import" and that the breakdown does not list stays, with its `tokens`: the breakdown counts such a file under Messages, not under memory files (ticket 01 recording). Every other note the breakdown does not list is removed. When the result has no `breakdown`, the mod keeps `memory` as it is.
- **F04-R2** The mod never calls `$.session.usage` with `breakdown: 'full'`, which sends one token-count request per tool and memory file (P2, NFR-S6).
- **F04-R3** When `classic.InstructionsLoaded` fires, the mod adds or updates the note for `file_path` with `type` from `memory_type`, `tokens: null` until the next refresh, and `reason` from `load_reason`: "at start", "nested", "path rule", "import" or "after compaction".
- **F04-R6** When `prompt.attachment` of type `nested_memory` fires for the main loop (no `agentId`), the mod sets `tokens` of the note for the path in the first line of its `text` ("Contents of <path>:") to the local estimate of that text, `ceil(characters / 4)` (02 Data model), and does nothing when there is no such note. No request is made (NFR-S6).
- **F04-R4** The list view's Memory section shows each note's type, path, reason (when known) and "≈tokens" (or "≈?"), and the section's total, a note of unknown size counted apart ("(+1 unknown)").
- **F04-R5** The graph draws memory notes as squares `■` in their own cluster, labelled with their type, outside the file meter (I1).

## Acceptance criteria

- **F04-AC1** Given `usage` reports two memory files, then `memory` holds two notes with path, type and tokens.
- **F04-AC2** Given a memory file disappears from the breakdown, then its note is gone after the next refresh.
- **F04-AC3** The hooks source never passes `breakdown: 'full'` (static check).
- **F04-AC4** Given the working directory `/w`, when `classic.InstructionsLoaded` fires with `file_path: '/w/src/auth/CLAUDE.md'`, `memory_type: 'Project'`, `load_reason: 'nested_traversal'`, then `memory` holds `src/auth/CLAUDE.md` with type `Project`, reason "nested" and `tokens: null`, before any refresh.
- **F04-AC5** Given `CLAUDE.md` is a memory note and Claude also reads it with `Read`, then it is both a note and a file node, and the file meter counts it once.
- **F04-AC7** Given `src/auth/CLAUDE.md` is a note with reason "nested", when its `nested_memory` attachment of the main loop fires, then its `tokens` is `ceil(characters / 4)` of the attachment text; an attachment with an `agentId`, or for a path with no note, changes nothing.
- **F04-AC8** Given a note with reason "nested" that the breakdown does not list, when `usage` is refreshed, then the note stays with its `tokens`; and a note with reason "at start" that the breakdown does not list is gone (F04-AC2).
- **F04-AC6** Given `usage` returns no `breakdown`, then `memory` is unchanged and nothing is logged beyond the debug log.

## Implementation decisions

- **Two sources, one list.** The usage breakdown is the truth about the memory files it lists, so a refresh replaces those. `classic.InstructionsLoaded` adds immediacy and the reason, and the files the breakdown does not list at all (a nested `CLAUDE.md` is counted under Messages): those notes stay, sized from their own `nested_memory` attachment.
- **Size by attachment, not by file read.** The attachment already carries the text Claude Code put in the window, so the estimate needs no file access (NFR-S1 allows no `$.fs`) and no request.
- **Refresh on `session.measure`.** It fires after each main-thread turn when the fill moved, which is when the set of memory files can have changed. No timer, no polling.
- **`summary`, never `full`.** `summary` estimates locally; `full` asks the token-count API once per file, which costs requests and sends file names off the machine.
- **Squares, not diamonds.** Decisions (F12) are diamonds; memory must never look like one.

## Testing decisions

- **Seam:** the engine test kit. The test's own `on('session.usage', …)` beneath answers a recorded `SessionUsage` with a summary breakdown; the test raises `$.session.measure(…)` and `$.classic.InstructionsLoaded(…)` and reads the `memory` key.
- F04-AC3 is a source scan in `check-calls.mjs` (NFR-S6).
- F04-AC4 runs before any refresh to prove the immediacy.

## Mods API used

| Need | Event or method |
| --- | --- |
| Memory files and sizes | `$.session.usage({ breakdown: 'summary' })` → `context.breakdown.memoryFiles[]` (`path`, `type`, `tokens`) |
| When to refresh | `session.start`; `session.measure` with `changed` holding `context` |
| Size of a nested file | `prompt.attachment` with `type: 'nested_memory'`: `text` ("Contents of <path>:" and the file) |
| Loads as they happen | `classic.InstructionsLoaded`: `file_path`, `memory_type`, `load_reason` |

## Data model changes

Adds `MemoryNote` (with `reason`) and the `memory` key.

## Manual check

1. In a copy of `fixtures/sample-app` (it has a `CLAUDE.md`), run `/graph list`. The Memory section lists the project `CLAUDE.md`, and your user `CLAUDE.md` if you have one, with types.
2. Ask Claude to read `src/auth/login.ts`. While the turn runs, `src/auth/CLAUDE.md` appears with "nested" and "≈?"; after the turn it has a size.

## Out of scope

- Showing the text of memory files. They are the person's own files; the pane names them.
- Skills, agents and MCP tool listings, which `/context` already itemizes.

## Open questions

- [x] **F04-Q2** Does a nested file load again after a compaction, and does the breakdown then list it? Answered in the manual check (2.1.296): a nested note stays through `/compact`, as R1 has it. The project `CLAUDE.md` does fire `classic.InstructionsLoaded` with `load_reason: 'compact'`, but the note written then does not survive, so its reason stays "at start" and "after compaction" is not seen in practice (cosmetic, no requirement changes). A nested file that Claude also reads with `Read` fires neither `InstructionsLoaded` nor a `nested_memory` attachment: it is a file node only, no memory note.
- [x] **F04-Q1** Does a nested `CLAUDE.md` loaded mid-turn show up before the next `turn.complete`? Answered from the 2.1.296 types: `classic.InstructionsLoaded` fires with `load_reason: 'nested_traversal'` when it loads (F04-R3).

## Changelog

- 2026-10-11 Draft. Memory nodes are squares, not diamonds, so they never look like decisions.
- 2026-10-11 Review. Checked against the 2.1.296 types. Refresh moved to `session.measure`; added `classic.InstructionsLoaded` for immediate nested loads and their reason; memory kept outside the file meter.
- 2026-10-11 Approved by the owner.
- 2026-10-12 Revised after the ticket 01 recording: the summary breakdown never lists a nested `CLAUDE.md`, so a plain replace (R1) dropped the note R3 adds. R1 keeps notes loaded mid-conversation that the breakdown does not list; R6 sizes a nested note from its `nested_memory` attachment (owner chose this option). Added AC7, AC8, Q2.
- 2026-10-13 Implemented. Manual check walked with the owner; F04-Q2 answered (nested notes survive a compaction; an explicit `Read` of a nested `CLAUDE.md` loads no memory note).
- 2026-10-13 Verified: CI green on PR #9.
