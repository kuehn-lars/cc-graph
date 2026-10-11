# F12 Decisions (opt-in)

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Review | v0.6 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | F06, F08, F09, F11, F14 |

## Problem

The choices that shape a change ("in-memory, not Redis", "limit by IP") live in Claude's prose for one turn and then scroll away. Thinking excerpts help, but they are raw and not always visible. A reviewer cannot see which decision a file came from.

## Solution

When the person switches it on, Claude gets a small tool to log a decision with a title, the files it affects and the reason, plus one short instruction to use it for real choices. Each decision becomes a diamond linked to its files, with a card and a list section. This is the one feature that changes what Claude sees, so it is off by default and leaves no trace when off.

## User stories

1. As a reviewer, I want Claude's decisions drawn next to the files they shaped, so that the reasoning survives after the turn.
2. As a reviewer, I want each decision's reason in its card, so that I can judge it without the transcript.
3. As a cautious developer, I want decision logging off unless I turn it on, so that nothing changes what Claude sees by default.
4. As a developer, I want the instruction short and the tool cheap, so that turning it on costs little context.
5. As a developer, I want bad tool input refused with a clear message to Claude, so that a malformed call never breaks the graph.

## Requirements

- **F12-R1** While the `decisions` setting is on, the mod registers at `session.start` a tool with `$.tool.register({ name: 'log_decision', description, inputSchema, isDeferred: false })`, which Claude Code lists as `mcp__cc-graph__log_decision`. Its input is `{ title: string, files: string[], because?: string }`.
- **F12-R2** While the setting is on, the mod's `prompt.compose` hook appends one section `{ id: 'cc-graph-decisions', text, scope: 'session' }` after the sections `next(e)` resolved, with the text: "When you choose between real alternatives that shape the code (a library, a data structure, where logic lives), call log_decision once with a short title, the files it affects and why. Don't log routine steps."
- **F12-R3** While the setting is off, the mod registers neither the tool nor the `prompt.compose` hook (P1).
- **F12-R4** When `mcp__cc-graph__log_decision` is called with valid input, the mod's `tool.call` hook answers at once with `{ result: { logged: true, id } }` (it is the tool, so it does not call `next`), and stores a `Decision` with the next id (`D1`, `D2`, …) and the current turn.
- **F12-R5** The mod cuts `title` to 60 characters and `because` to 160, keeps at most 20 `files`, normalizes them by I4, and adds a `ghost` for each that has no node (I3), with a `decision` edge to each.
- **F12-R6** If the input is malformed (no `title`, or `files` not a list of strings), then the mod answers `{ result: { logged: false, error } }` naming the problem and stores nothing.
- **F12-R7** Decisions draw as violet diamonds `◆` with dashed edges to their files (F09, F10), and the list view gains a Decisions section, newest first, each row the title and its file count.

## Acceptance criteria

- **F12-AC1** With `decisions: false`, `$.tool.list()` has no `mcp__cc-graph__log_decision`, and the composed prompt has no section `cc-graph-decisions`.
- **F12-AC2** With `decisions: true`, a call with two files stores one decision with two `decision` edges.
- **F12-AC3** A file in `files` that has no node becomes a `ghost`.
- **F12-AC4** A call with a 200-character title stores a 60-character title.
- **F12-AC5** With `decisions: true`, the section `cc-graph-decisions` is the last composed section and has `scope: 'session'`.
- **F12-AC6** A call whose `files` is a string answers `logged: false` with an error, and stores nothing.

## Implementation decisions

- **`isDeferred: false`.** A deferred tool hides behind ToolSearch, and Claude would rarely load it on its own; the small schema in the tool list is the price of being used at all.
- **The section goes last, as `session`.** A section scoped `session` after the shared ones keeps the shared prompt prefix cacheable; the hook only appends, never edits the engine's sections.
- **The tool answers itself.** It is the one hook that returns its own result instead of `next(e)`'s, because no engine behaviour sits beneath a plugin's own tool. It still carries a `.catch` that hands the call on, so a bug reads to Claude as an ordinary tool error.
- **Off means absent.** Options are fixed per activation and a change reloads the module, so with the setting off the tool and the hook are simply never registered: P1 holds without exceptions to audit.

## Testing decisions

- **Seam:** the engine test kit with `test(name, { options: { decisions: true } }, …)`. Tests call `$.tool.call({ tool: 'mcp__cc-graph__log_decision', … })`, read `$.tool.list()`, and run `$.prompt.compose()` with the test's hook beneath answering a fixed list of sections.

## Mods API used

| Need | Event or method |
| --- | --- |
| The tool | `$.tool.register({ name, description, inputSchema, isDeferred: false })` in `session.start`; served by `tool.call` matched to `{ tool: 'mcp__cc-graph__log_decision' }` |
| The instruction | `prompt.compose`: `next(e)` resolves `{ sections }`, each `{ id, text, scope }`; one appended |
| Checks | `$.tool.list()` |

## Data model changes

Adds `Decision`, `Graph.decisions`, and `Edge` with `kind: 'decision'`.

## Manual check

1. Turn on `decisions` in `/config` and start a new session in a copy of `fixtures/sample-app`.
2. Ask Claude to add rate limiting and to choose between Redis and an in-memory limiter.
3. A diamond appears linked to `rateLimit.ts`, and its card shows the reason.
4. Turn the setting off and start a new session: `/context` lists no CC Graph section and no `log_decision` tool.

## Out of scope

- Measuring how often Claude logs decisions. A `claude plugin eval` suite over the reference session is a later idea in the roadmap.
- Editing or deleting decisions from the pane.

## Open questions

- [ ] **F12-Q1** Does calling a plugin's own registered tool raise a permission prompt by default? If it does, the mod adds a `tool.check` hook matched to exactly `mcp__cc-graph__log_decision` that answers `{ decision: 'allow' }`, and nothing else. Spike S5, at the start of v0.6.

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Checked against the 2.1.296 types. Named the listed tool `mcp__cc-graph__log_decision`, added `isDeferred: false`, the exact instruction text, input validation, ids, the list section, and the permission question.
