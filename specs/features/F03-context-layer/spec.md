# F03 Context layer

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Verified | v0.1 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | F01, F02, F08 |

## Problem

After `/compact` or an automatic compaction, Claude knows most earlier files only from a summary, but nothing on screen says which ones. `/context` shows how full the window is, not what fills it. And after `/clear`, `/resume` or `/branch`, a view that remembered the old conversation would describe a context Claude no longer has.

## Solution

The pane always describes the conversation on screen. A compaction hollows every file Claude now knows only from the summary, while files whose reads Claude Code kept, or re-attached afterwards, stay filled. A meter shows the estimated size of the files in context next to the window's real fill, and the pane starts empty whenever the conversation does.

## User stories

1. As a developer, I want files lost to compaction to turn hollow, so that I know which ones Claude now knows only from a summary.
2. As a developer, I want files Claude Code kept or re-attached to stay filled, so that the pane doesn't claim Claude forgot what it still has.
3. As a developer, I want a compaction's before and after sizes recorded, so that I see how much was cut.
4. As a developer, I want the estimated size of the files in context next to the real window fill, so that I see what fills the window.
5. As a developer, I want unknowns shown as unknown, so that the meter never pretends to precision.
6. As a developer, I want a subagent's compaction to leave the main view alone, so that a subagent's housekeeping isn't mistaken for the main conversation's.
7. As a developer, I want the pane to start empty after `/clear`, `/resume` or `/branch`, so that it describes the conversation in front of me.

## Requirements

- **F03-R1** When `session.compact` resolves a compaction that stands (a result with `messages` and no `skip`) for the main loop (no `e.agentId`) with a `trigger` other than `precompute`, the mod moves every `read`, `partial` and `search` node the main loop touched (`mainLoop`, F15) to `compacted`, except nodes whose `readId` is the `tool_use_id` of a tool use in the result's `messages`. It keeps every node's `change` and stores a `CompactMark` with the turn, trigger, `tokensBefore`, `tokensAfter` (each `null` when absent) and the number of nodes kept.
- **F03-R2** When a `compacted` file is read again, F01 restores it to `read` or `partial`.
- **F03-R3** When a main-loop `prompt.attachment` of `type: 'file'` names a `compacted` node, the mod sets that node to `read` with `seen` "re-attached after compaction" and `tokens` from the attachment text. The path is the `file_path` of the JSON object on the text's first line, normalized by I4 (F03-Q1). A re-attached memory file, such as a nested `CLAUDE.md`, also arrives as a `file` attachment; it is not a `compacted` file node, so this requirement leaves it alone.
- **F03-R4** When `session.measure` reports `context` among `changed`, the mod stores `fill` as `{ tokens, window, percent }` from `e.context`, with `null` for a figure that is absent.
- **F03-R5** The meter shows the estimated tokens of the files in context (I1), marked "≈", the count of files with unknown size, and the window's real fill, for example "≈12.4k in 7 files (+2 unknown) · window 41% of 200k".
- **F03-R6** While no measurement has reported a fill, or one reported without `percent`, the meter shows the window part as "window –".
- **F03-R5a** A count below 1,000 reads as the plain number ("850"); from 1,000 it reads in thousands with one decimal and no trailing ".0" ("12.4k", "200k", "1k").
- **F03-R7** When `classic.SessionStart` fires with `source` `clear`, `resume` or `fork`, the mod resets every key to its empty value except `view` (02 Data model, Reset). A `startup` or `compact` source changes nothing.
- **F03-R8** If a compaction carries `agentId`, then the mod changes no node (I7).
- **F03-R9** The text summary `/graph` answers where nothing draws (F08-R4) starts with the meter line.

## Acceptance criteria

- **F03-AC1** Given two `read` nodes and one `edited` node, when the main conversation compacts and keeps no read, then all three are `compacted` and the edited one keeps `change: edited`.
- **F03-AC2** Given a compaction with `agentId` set, then no node changes.
- **F03-AC3** Given a compaction the chain answered with `{ skip }`, then no node changes.
- **F03-AC4** Given a `compacted` node, when it is read whole again, then it is `read`.
- **F03-AC5** Given `session.measure` reports `tokens: 82000`, `window: 200000`, `percent: 41`, then the meter's window part reads "window 41% of 200k".
- **F03-AC6** Given a compaction with `trigger: 'precompute'`, then no node changes.
- **F03-AC7** Given a compaction with `tokensBefore: 496862` and `tokensAfter: 20125`, then `compactions` holds one mark with those numbers.
- **F03-AC8** Given a graph with nodes, when `classic.SessionStart` fires with `source: 'clear'`, then the graph is empty and `view` is unchanged.
- **F03-AC9** Given `src/a.ts` read by the call `toolu_01` and `src/b.ts` by `toolu_02`, when a compaction's kept messages hold the tool use `toolu_02`, then `src/a.ts` is `compacted`, `src/b.ts` stays `read`, and the mark has `kept: 1`.
- **F03-AC10** Given a graph with nodes, when `classic.SessionStart` fires with `source: 'compact'`, then nothing changes.
- **F03-AC11** Given `src/a.ts` is `compacted`, when a `file` attachment re-attaches it, then it is `read` with `seen` "re-attached after compaction".
- **F03-AC12** Given no measurement yet, then the meter's window part reads "window –".
- **F03-AC13** Given no surface is attached and no measurement yet, then `/graph` answers a text whose first line is the meter line, ending "window –".

## Implementation decisions

- **Kept messages decide what survives.** A compaction's result is the conversation afterwards: the summary plus the messages Claude Code kept verbatim. A read whose tool use is among them is still in context, and so is a search whose call is among them (a search node's `readId` is its latest search call, F02-R5). Storing each node's `readId` makes that check exact and cheap.
- **Re-attached files only revive compacted nodes.** `file` attachments also carry `@` mentions, which F01 already handles through `prompt.mention`; limiting F03-R3 to compacted nodes keeps the two from double-counting.
- **`session.measure` over polling.** The engine pushes the fill after each main-thread turn, only when it moved, at no cost. Polling `$.session.usage()` at `turn.complete` would read the same figures later.
- **Reset on `classic.SessionStart`.** `/clear` raises `session.end` with `reason: 'clear'` and no new `session.start` (that event fires once per load), so the classic event, which carries `source`, is the one signal for every new conversation. Its `compact` source fires after every compaction and must not reset. The reset is explicit, so it holds whether or not the host keeps `$.state` across `/clear`.

## Testing decisions

- **Seam:** the engine test kit. A test raises `$.session.compact({ trigger: 'manual', messages })`; its own `on('session.compact', …)` beneath answers `{ messages: kept, tokensBefore, tokensAfter }`, or `{ skip: 'test' }` for F03-AC3.
- Fill tests raise `$.session.measure({ context, rateLimits: [], changed: ['context'] })`; reset tests raise `$.classic.SessionStart({ source })`; re-attachment raises `$.prompt.attachment({ type: 'file', text, origin: { kind: 'engine' } })` with text captured in spike S1.
- The meter's wording is asserted through `$.ui.mount` on the list view (F03-AC5, AC12).

## Mods API used

| Need | Event or method |
| --- | --- |
| Compaction | `session.compact` after `next(e)`: input `trigger`, `agentId`; result `messages[].toolUses[].tool_use_id`, `tokensBefore`, `tokensAfter`, or `skip` |
| Re-attached files | `prompt.attachment` with `type: 'file'` (text only); `agentId` absent on main |
| Fill | `session.measure`: `changed`, `context.tokens`, `context.window`, `context.percent` |
| Reset | `classic.SessionStart`: `source` |
| Robustness | `.catch(($, e, next) => next(e))` on `session.compact` |

## Data model changes

Adds the `compacted` state, `FileNode.readId`, `CompactMark`, `Graph.compactions`, and the `fill` key. Defines the reset.

## Manual check

1. In a copy of `fixtures/sample-app`, have Claude read three files, then run `/compact`.
2. `/graph` shows the three as `○`, except any Claude Code re-attached, and the meter shows the new fill after the next turn.
3. Ask Claude to read one again: it returns to `●`.
4. Run `/clear`: the pane shows "Nothing read yet."

## Out of scope

- A per-category breakdown of the window. `/context` does that.
- Subagent compactions, which never touch the main view (I7). A per-agent view is a later idea in the roadmap.

## Open questions

- [x] **F03-Q1** What text does a `file` attachment carry after a compaction, and does it name the path in a stable form? Are some files re-attached only as a reference (`compact_file_reference` in session transcripts), which would mean Claude has the path but not the content? Spike S1: compact a session in `fixtures/sample-app` after five reads and edits, log every `prompt.attachment` that follows (type, origin, first 200 characters), and record the result next to this spec. Blocks approval (F03-R3 depends on it). Answered by spike S1 ([spike-s1.md](spike-s1.md)): the first line is `Called the Read tool with the following input: {"file_path":…}` with an absolute path, followed by the `Read` tool's numbered output. Every re-attached file carried its content; no reference-only form was raised. The engine re-attached the files Claude had read whole or written, five in the reference session.

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Checked against the 2.1.296 types. Reads kept in the compaction's messages now survive (F03-AC9); the fill comes from `session.measure`; `source: 'compact'` must not reset (F03-AC10); re-attachment limited to compacted nodes; meter wording fixed.
- 2026-10-12 F03-Q1 answered by spike S1; F03-R3 names where the path is read from and that a re-attached memory file is left alone. Approved by the owner.
- 2026-10-12 F03-R9, AC13: the meter line of F08's text summary moves here, since F08 ships first. Approved by the owner.
- 2026-10-12 F02 ticketing: a search node's `readId` is its latest search call, so F03-R1 keeps it when the compaction keeps that call. No requirement changes. Approved by the owner.
- 2026-10-12 Meter wording settled with the owner: number format (F03-R5a) and a fill without `percent` (F03-R6). No criteria change.
- 2026-10-12 Implemented. Manual check walked with the owner in a terminal; every criterion has a passing test. Re-attached files reach the pane on the next request, not at the compaction (spike S1).
- 2026-10-13 Manual check walked with the owner in the desktop app too. Verified for v0.1: CI green on `main`.
