# F13 Timeline

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Review | v0.6 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | F03, F08, F09 |

## Problem

The pane shows the present. A reviewer reading a long session wants to know when Claude learned something, when it changed something, and where a compaction cut its memory, and the transcript answers that only by scrolling.

## Solution

Three keys step the pane back and forth through the conversation one turn at a time, and back to live. The header says which turn is shown and marks turns with a compaction. Nodes keep their live positions, so stepping shows the graph growing in place. Scrubbing never touches the live graph, which keeps updating underneath.

## User stories

1. As a reviewer, I want to step back through the graph turn by turn, so that I can see in which turn Claude learned or changed what.
2. As a reviewer, I want turns with a compaction marked, so that I see where Claude's memory was cut.
3. As a reviewer, I want nodes to stay where they are while I step, so that the picture doesn't jump.
4. As a developer, I want Claude's work to keep landing in the live graph while I look back, so that scrubbing never loses anything.
5. As a developer, I want one key back to live, so that I never get stuck in the past.

## Requirements

- **F13-R1** When a main-loop `turn.complete` fires, the mod appends a snapshot: the turn, the time from `$.clock`, and the diff of `graph` since the previous snapshot.
- **F13-R2** When more than 50 snapshots are kept, the mod folds the oldest into `timeline.base`, so the base plus every kept diff always rebuilds the live graph.
- **F13-R3** When `p` is pressed, the view steps one turn back; `n` steps one forward; `0` returns to live. The header reads "turn 7 of 12" while scrubbing and "live" otherwise.
- **F13-R4** Scrubbing writes only the `viewTurn` key, never `graph`, `layout` or `timeline`.
- **F13-R5** While scrubbing, every node is drawn at its live position from `layout`; a node that does not exist at the shown turn is not drawn.
- **F13-R6** The header marks a turn that holds a compaction with "compacted" beside its number.
- **F13-R7** While scrubbing, a new event updates the live graph and the view stays on the turn shown; the header adds "· live has moved on".
- **F13-R8** Turns older than the oldest kept snapshot cannot be shown; `p` stops at the oldest kept turn, and the header says "earliest kept".

## Acceptance criteria

- **F13-AC1** Applying every kept snapshot's diff, in order, to `timeline.base` gives the live graph exactly.
- **F13-AC2** Given 60 turns, then 50 snapshots remain, the newest, and F13-AC1 still holds.
- **F13-AC3** While scrubbed back, a new tool call updates the live graph, the view stays where it was, and the header says "live has moved on".
- **F13-AC4** Pressing `0` after scrubbing sets `viewTurn` to `null`.
- **F13-AC5** Given the reference session, pressing `p` once shows turn 1: `test/login.test.ts` is not drawn and the header reads "turn 1 of 2".
- **F13-AC6** Given 60 turns, pressing `p` 60 times stops at the oldest kept turn with "earliest kept" in the header.

## Implementation decisions

- **Diffs over a base.** Full copies of the graph per turn would break NFR-P5 on long sessions; diffs alone could not be pruned without losing replay. Folding the oldest diff into a base keeps both: small, and exact.
- **Snapshots at main-loop `turn.complete` only.** A subagent's run ends with its own `turn.complete`; those changes land in the main loop's next snapshot.
- **Positions are live.** Replaying layout per turn would make nodes jump between snapshots. Using today's positions shows the graph growing in place.
- **Keys `p`, `n`, `0`.** A `Button` hotkey must be one digit or lowercase letter, so the `[` and `]` of the earlier draft are not possible.

## Testing decisions

- **Seam:** event tests raise `$.turn.complete(…)` for the main loop, compare a replay of `timeline` with `graph` (F13-AC1, AC2), and read `viewTurn`. UI tests press `p`, `n` and `0` on a mounted pane and read the header (F13-AC3 to AC6). The clock is mocked.

## Mods API used

| Need | Event or method |
| --- | --- |
| Snapshot point | `turn.complete` without `agentId`: `turnId` |
| Time | `$.clock.now()` (mocked in tests) |
| Keys | `Button` with `hotkey` `p`, `n`, `0` |

## Data model changes

Adds `Snapshot`, `GraphDiff`, `Timeline` (with `base`), and the `timeline` and `viewTurn` keys.

## Manual check

1. After the reference session, press `p`. The graph steps back to turn 1 and the header reads "turn 1 of 2"; the compaction between the turns is marked.
2. Ask Claude a new question while scrubbed back. The view stays put and the header says "live has moved on". Press `0` to see the new turn.

## Out of scope

- Stepping by step within a turn.
- Keeping the timeline across `/clear` or sessions.

## Open questions

None.

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Keys changed from `[` `]` to `p` `n` (hotkeys must be a digit or lowercase letter); added the base snapshot so pruning keeps replay exact; added the "live has moved on" and "earliest kept" states.
