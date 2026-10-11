# 00 Product

| Status | Owner | Checked against |
| --- | --- | --- |
| Review | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 |

CC Graph is a Claude Code mod. It draws a live pane beside the conversation that shows which files Claude read, searched and changed, what is still in its context window, which memory files it works under, what it was thinking, and which code that depends on its changes it never opened.

## Problem statement

After a long turn, nobody can say without scrolling back what Claude actually has in its context, what it changed, and what it never looked at. The tools Claude Code ships each answer a different question:

- `/context` shows token totals by category, not which files they are or whether Claude saw them whole.
- The transcript is a linear log. A partial read, a search hit and a full read look alike once they scroll past.
- `/diff` shows what changed, not what depends on it or what Claude knew when it changed it.

So the questions a developer needs answered before trusting the next edit stay open:

1. Did Claude read the whole file, only part of it, only see search hits, or lose it to compaction?
2. Which files depend on what it edited, and did it ever open them?
3. What changed behind its back: a shell command, the person, a formatter?
4. What was it thinking when it made that change?

## Solution

`/graph` opens a pane that answers those four questions at a glance and keeps answering them as the session runs. Every file is a node whose look says what Claude saw of it. Changes carry a ring and a word. Files that import a change but were never opened are flagged as blind spots, with one key to `@`-mention them into the prompt. Thinking, memory files and, when switched on, Claude's own logged decisions are linked to the files they shaped. A list view carries the same facts on every surface, and a timeline replays how the picture grew.

CC Graph only watches. It never changes what Claude sees or does, never sends anything off the machine, and never calls a model unless the person presses "Ask why".

## Users

| User | Situation | Needs from CC Graph |
| --- | --- | --- |
| Developer in a long session | Hours in, after one or more compactions | Know what Claude still knows before trusting its next edit |
| Reviewer of agent work | Reading what Claude did in a turn or a session | See what changed, what depends on it, and the reasoning behind it |
| Developer steering Claude | Watching a turn as it runs | Spot a blind spot early and point Claude at the file it should read |
| Mod author or curious user | Learning how Claude Code works | See context, compaction and subagents as they happen |

## User stories

Each story names the features that deliver it.

### Knowing what Claude has in context

1. As a developer, I want every file Claude read to appear in one place, so that I don't reconstruct its reading list from the transcript. (F01, F08)
2. As a developer, I want a partial read to look different from a full read, so that I know when Claude saw only lines 1 to 40 of a 400-line file. (F01)
3. As a developer, I want a file Claude only saw as search hits to look different from one it opened, so that I never mistake a grep for a read. (F02)
4. As a developer, I want files Claude lost to compaction to look hollow, so that I know which ones it now knows only from a summary. (F03)
5. As a developer, I want files Claude Code kept or re-attached after compaction to stay filled, so that the pane doesn't claim Claude forgot what it still has. (F03)
6. As a developer, I want an estimated token size per file next to the window's real fill, so that I see what is filling the context. (F03)
7. As a developer, I want every estimate marked "≈" and every unknown shown as unknown, so that the pane never pretends to precision it doesn't have. (F03, P5)
8. As a developer, I want files I `@`-mentioned to count as read, so that the pane matches what Claude was actually given. (F01)
9. As a developer, I want the memory files Claude works under listed with their type and size, so that I know which instructions are in force. (F04)
10. As a developer, I want a nested `CLAUDE.md` to appear the moment Claude Code loads it, so that I see when new instructions arrive mid-turn. (F04)
11. As a developer, I want files a subagent read marked as the subagent's, so that I don't assume the main conversation knows them. (F15)
12. As a developer, I want the pane to start empty after `/clear`, `/resume` or `/branch`, so that it always describes the conversation in front of me. (F03)

### Seeing what changed and what depends on it

13. As a reviewer, I want edited and created files ringed and labelled with their line counts, so that I see the size of each change. (F01)
14. As a reviewer, I want files changed by a shell command marked with the command that changed them, so that an `npm install` or a formatter run is never invisible. (F07)
15. As a reviewer, I want files I changed myself in an editor marked as outside changes Claude was shown, so that I can tell them from changes Claude never saw. (F07)
16. As a developer steering Claude, I want files that import something Claude changed, but that Claude never opened, flagged as blind spots, so that I can ask Claude to check them before it moves on. (F07)
17. As a developer steering Claude, I want a blind spot to show up while the turn is still running, so that I can interrupt before Claude builds on a broken assumption. (F07)
18. As a developer, I want import edges between the files Claude read, so that I see how its reading list hangs together. (F06)
19. As a developer, I want the graph built only from text Claude already saw, so that drawing it never costs Claude context or reads my files. (F06)

### Understanding why

20. As a reviewer, I want Claude's visible thinking kept per step and linked to the files touched in that step, so that I can read what it was thinking when it changed a file. (F05)
21. As a reviewer, I want to ask "why did you change this file?" and get a side answer that doesn't enter the conversation, so that I can question Claude without steering it. (F11)
22. As a reviewer, I want Claude's own logged decisions drawn next to the files they shaped, so that the reasoning survives after the turn scrolls away. (F12)
23. As a cautious developer, I want decision logging off unless I turn it on, so that nothing changes what Claude sees by default. (F12, P1)

### Acting on what I see

24. As a developer, I want one key to put ` @path ` into my prompt for the selected file, so that steering Claude to a blind spot takes a second. (F11)
25. As a developer, I want one key to open the selected file in my editor at the changed line, so that I can check a change myself. (F11)
26. As a developer, I want every action reachable by keyboard, so that I never need the mouse in a terminal. (F08, NFR-A2)
27. As a desktop user, I want to click a node to select it, so that the graph works the way a desktop graph should. (F10)

### Looking back

28. As a reviewer, I want to step back through the graph turn by turn, so that I can see in which turn Claude learned or changed what. (F13)
29. As a reviewer, I want turns with a compaction marked on the timeline, so that I see where Claude's memory was cut. (F13)

### Fitting into how I work

30. As a terminal user, I want a real graph drawn in the terminal, so that I get the picture without leaving it. (F09)
31. As a desktop user, I want a vector graph with labels and tooltips, so that it reads like the rest of the app. (F10)
32. As a user of a surface that draws no graph, I want the same facts as a list, so that nothing is lost. (F08)
33. As a developer in a big repository, I want the graph capped and pruned by a clear rule, so that it stays readable and never drops a changed file. (F14, I5)
34. As a privacy-minded developer, I want to switch thinking capture off and know that nothing leaves my machine, so that I can use CC Graph on sensitive code. (F14, NFR-S1)
35. As a developer, I want to change the cap, the editor command and the opt-in features in `/config`, so that I never edit JSON. (F14)
36. As any user, I want CC Graph to keep working when it fails, so that a bug in a mod never breaks my session. (NFR-R1, NFR-R2)
37. As any user, I want CC Graph to cost nothing noticeable, so that Claude streams and runs tools as fast as without it. (NFR-P1, NFR-P2)

## Goals

| ID | Goal | Answered by |
| --- | --- | --- |
| G1 | **What does Claude know right now?** Every file shows as fully read, partly read, seen only through search hits, or compacted away, with an estimated size next to the window's real fill. Memory files and subagent reads are told apart. | F01, F02, F03, F04, F15 |
| G2 | **What changed, and what depends on it?** Edits, new files, shell changes and outside changes are marked. Files that import changed code but were never opened are flagged as blind spots. | F01, F06, F07 |
| G3 | **Why did it do that?** Thinking, memory files and logged decisions are linked to the files they shaped, and a side question can ask why. | F05, F11, F12 |

### How we know it works

- In the [reference session](../04-reference-session/spec.md), someone who has not seen the transcript can answer the four questions of the problem statement from the pane alone.
- The scripted replay of the reference session ends in exactly the expected graph (RS-5).
- Every NFR passes in CI on the pinned Claude Code version.

## Non-goals

- **Code intelligence.** No call graph and no language server. Edges come only from imports in text Claude already saw, plus `git grep` for the reverse direction.
- **Changing what Claude sees or does.** Observation only: no injected reads, no rewritten prompts or results. The opt-in decisions feature (F12) is the one exception, and it is off by default.
- **Network.** No network calls of any kind, and no model calls except an explicit "Ask why".
- **History across sessions.** The graph describes one conversation and starts over on `/clear`, `/resume` and `/branch`. Nothing is written to `$.store` or to disk.
- **Exact token counts.** File sizes are estimates. The window fill beside them is the engine's own figure.

## Principles

| ID | Principle | Consequence for design |
| --- | --- | --- |
| P1 | Observation only | Every hook returns `next(e)`'s result unchanged, and every gating hook carries a pass-through `.catch`. F12 is the one opt-in exception |
| P2 | Local only | No `$.http`, `$.store` or `$.fs`. `$.process.run` only for read-only `git` and the person's own editor command |
| P3 | Model calls only when asked | `$.model.fork` runs only on an "Ask why" press. No other `$.model` call exists |
| P4 | Cheap | A hook does constant work and returns. Layout and git run off the hook's return path, coalesced, and never while drawing |
| P5 | Honest | Estimates carry "≈". Unknowns show as unknown, never as zero. A known limit is said in the pane, not hidden |
| P6 | Works where Claude Code runs | The renderer follows the surface's element table: `Raster` where it exists, `Svg` where it exists, the list everywhere. The list always carries every fact |

## Platform constraints

All of these were checked against the Claude Code 2.1.296 types and the [Mods documentation](https://code.claude.com/docs/en/plugins/mods/overview).

- Mods need Claude Code v2.1.287 or later in the terminal. The desktop app bundles its own copy and runs mods from v2.1.286.
- The Mods API is early access and can change between releases. The generated types (`.claude-plugin/types/claude-code/index.d.ts`) are the authority, and every spec header records the version it was checked against.
- Hooks run in every kind of session that loads the plugin, but only the terminal and the desktop app's Code tab show what a mod draws. The VS Code chat panel, `claude -p`, the Agent SDK and cloud sessions run the hooks and draw nothing.
- Element tables differ by surface: `Raster` and `Image` are terminal only; `Svg` is in the desktop, VS Code and mobile tables, not the terminal's; `Client` is terminal and desktop only. A `Client` module cannot draw `Raster`, `Image` or `Svg`.
- A `Button` hotkey is one digit or one lowercase letter. Nothing else is accepted.
- A pane opened by the person's own command is placed at any width. One a mod opens unasked needs 144 columns (110 once the person has opened it before). So the pane opens on `/graph`.
- Native macOS and Linux builds register no `Grep` or `Glob` tool. Search runs through `Bash`.
- Mods are not sandboxed. A user can list what a mod hooks and calls with `claude plugin validate` before installing it, which is why CC Graph keeps that list short (NFR-S1).

## Glossary

| Term | Meaning |
| --- | --- |
| Node | A file, a memory file or a decision in the graph |
| Edge | An import from one file to another, or a link from a decision to a file |
| Node state | What Claude saw of a file: `ghost`, `search`, `partial`, `read`, `compacted` or `unread` ([02 Data model](../02-data-model/spec.md#node-states)) |
| In-context group | The `read`, `partial` and `search` states: what the main conversation still holds |
| Change | What happened to a file, kept apart from its state: `edited`, `created`, `external` or `blind` |
| Ghost | A file known to the graph that Claude never opened, typically one end of an import edge |
| Blind spot | A ghost that imports a file Claude changed, or a file changed outside Claude's tools that Claude was never shown |
| Layer | One kind of knowledge drawn on the graph: context, memory, thinking, decisions |
| Main loop | The conversation itself, as opposed to a subagent. Its events carry no `agentId` |
| Subagent only | A file only subagents touched. It is in their context, not the main conversation's |
| Turn | One prompt and everything until its `turn.complete`. Numbered from 1 per conversation |
| Step | One model request inside a turn (`turn.step`) |
| Compaction | Claude Code replacing the conversation with a summary plus what it keeps (`session.compact`) |
| Snapshot | What changed in the graph during one turn, kept for the timeline |
| Surface | Where a drawing is shown: `terminal`, `desktop`, `vscode` or `mobile` |
| Reference session | The scripted rate-limit story every check replays ([04](../04-reference-session/spec.md)) |

## Features

Each feature has its own spec under [`features/`](../features/). Status and milestones are in the [specs index](../README.md) and the [roadmap](../../ROADMAP.md).

| ID | Feature | Goal |
| --- | --- | --- |
| F01 | File tracking: reads, edits, writes, mentions | G1, G2 |
| F02 | Search-only tracking | G1 |
| F03 | Context layer: compaction, fill, reset | G1 |
| F04 | Memory layer | G1, G3 |
| F05 | Thinking layer | G3 |
| F06 | Import edges | G2 |
| F07 | Blind spots | G2 |
| F08 | Pane, list view and key map | all |
| F09 | Terminal graph and layout | all |
| F10 | Desktop graph and pointer selection | all |
| F11 | Detail card and actions | G2, G3 |
| F12 | Decisions (opt-in) | G3 |
| F13 | Timeline | G1, G2 |
| F14 | Settings | all |
| F15 | Subagent attribution | G1 |

## Names

| What | Value | Note |
| --- | --- | --- |
| Repository | `kuehn-lars/cc-graph` | MIT licensed |
| Plugin name | `cc-graph` | Permanent once released. Passes `claude plugin validate --strict` |
| Display name | CC Graph | What `/plugin` shows. Can change later |
| Marketplace name | `cc-graph` | The repository is its own marketplace: `cc-graph@cc-graph` |
| Slash command | `/graph` | Opens the pane |
| Pane id | `cc-graph` | One pane per id |
| `$.state` namespace | `cc-graph` | Must equal the plugin name: only the owner writes its values |

Why `cc-`: the validator refuses third-party names that start with `claude-`, `anthropic-` or `cc-plugin-`, and warns on names with `claude` as a whole word (`graph-for-claude-code` fails `--strict`). `cc-` is the community's shorthand for Claude Code tools. On 2026-10-11 the community catalog listed 2,284 plugins and no `cc-graph`.

## Risks

The largest risk is the Mods API itself: it is early access and moves between releases. The project pins a tested version, commits its generated types, and runs CI against the newest release as an early warning.

| Risk | Effect | Mitigation | Where |
| --- | --- | --- | --- |
| Mods API changes between releases | Hooks stop firing or fail validation | Pin the tested version, commit `.claude-plugin/types/`, CI job on `latest` | NFR-C1 |
| Files kept or re-attached after compaction are misread | "Compacted" shows files Claude still has | Keep nodes whose read survives in the kept messages; spike S1 on re-attached files | F03-R1, F03-Q1 |
| Thinking is redacted, summarized or absent | Thinking layer empty | Promise only what a mod receives; say "no thinking visible" | F05-Q1 |
| Wrapping `turn.step` slows streaming | Claude feels slower | NFR-P2 benchmark; with capture off the hook is not registered | NFR-P2, F14 |
| Token estimates are rough | The meter misleads | Always "≈", the engine's window fill beside it | F03-R5 |
| Search output formats vary | Missed or false search nodes | A fixed list of supported forms, fixtures captured from real output, unknown lines skipped | F02 |
| Shell changes to an already-dirty file are missed | A blind spot stays hidden | Known limit of the `git status` baseline, said in the spec; spike S4 on the engine's own per-command diff | F07-Q2 |
| Big repositories, small terminals | Unreadable graph | Node cap with an eviction order, label rule, list view | I5, F09-R6 |
| `Raster` and `Svg` take no clicks | No pointer selection on the graph | Keyboard and list-row selection everywhere; spike S3 on a `Client` overlay | F08, F10-Q1 |
| People worry a mod reads Claude's thinking | Trust | Short call list visible in `validate`, NFR-S1 in CI, capture can be switched off, README privacy section | NFR-S1, F14 |
| Work scheduled after a hook returns is not allowed | Git and layout need another home | Spike S0 in M0 before any feature relies on it | ARCH-Q1 |

## Open questions (cross-cutting)

Feature questions live in their feature specs as `Fxx-Qn`. Spikes that answer them are scheduled in the [roadmap](../../ROADMAP.md#spikes).

- [ ] **REL-Q1** Is `cc-graph` still free in the community catalog when v0.1 goes public? Checked free on 2026-10-11; check again before the first public tag.
- [ ] **REL-Q2** How does a community-listed plugin move past the commit its listing is pinned to? Ask through the submission form before v1.0.
- [ ] **UX-Q1** Should CC Graph offer to open its pane by itself when the terminal is 144 columns or wider, or only ever on `/graph`?

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Checked against the 2.1.296 types. Added problem statement, solution, user stories, success checks and platform facts; principles P2 and P6 tightened; milestones moved to the roadmap.
