# F08 Pane, list view and key map

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Review | v0.1 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | none |

## Problem

The facts the other features gather need one place to live that works on every surface, at any width, by keyboard alone, and that never gets in the way of the conversation.

## Solution

`/graph` opens a pane beside the conversation. Its list view shows every layer as compact rows that fit the pane's width: the meter, memory files, files newest first, thinking, blind spots. It is the first thing shipped and the fallback on every surface, and the graph views of F09 and F10 sit in the same pane behind one key. Where a session draws nothing, `/graph` answers with a short text summary instead.

## User stories

1. As a developer, I want one command that opens the pane, so that I can bring it up when I need it and close it with Esc.
2. As a developer, I want the list to fit any pane width without wrapping, so that it stays readable beside the conversation.
3. As a developer, I want long paths cut from the start, so that I always see the file name.
4. As a developer, I want every row selectable by keyboard and by click, so that I can open a file's card either way.
5. As a developer, I want each empty section to say it is empty, so that I can tell "nothing yet" from "broken".
6. As a user of a surface that draws no graph, I want the same facts as a list, so that nothing is lost.
7. As a developer in `claude -p` or the SDK, I want `/graph` to answer in text, so that the command still tells me something.
8. As a developer, I want the view I picked to stay picked, so that the pane opens the way I left it.

## Requirements

- **F08-R1** When `session.start` fires, the mod registers `/graph` with `immediate: true`, the description "Show what Claude read, searched and changed", and the argument hint `[list|graph]`.
- **F08-R2** When `/graph` runs, the mod sets `view` to `list` or `graph` when that is the argument, opens pane `cc-graph` with title "CC Graph", `focus: true`, `closeOnEscape: true` and `columns: 64`, and answers its own command with `{ text: 'CC Graph opened.' }`.
- **F08-R3** If `$.ui.open` resolves `isPlaced: false`, then the mod shows a toast "CC Graph is waiting for room: ‹reason›".
- **F08-R4** If `$.session.surfaces()` is empty when `/graph` runs, then the mod opens no pane and answers with a text summary: the meter line, the count of files per state (in the order `read`, `partial`, `search`, `compacted`, `unread`, `ghost`) and per change (`edited`, `created`, `external`, `blind`), zero counts left out, and, once F07 ships, up to 5 blind spots (NFR-C3).
- **F08-R5** The list view shows, top down: a header with the meter (F03) and, while scrubbing, the turn (F13); Memory (F04); Files, most recently touched first (`touched`), each row the state glyph, the path, the change badge and "≈tokens · seen"; Thinking (F05); Blind spots (F07); Decisions (F12); the footer notes. A section of a feature not yet shipped is not drawn.
- **F08-R6** The mod draws no row wider than `e.props.bodyColumns`. A path that does not fit is cut from the start and led by "…", so its file name stays; rows never wrap.
- **F08-R7** Each section has an empty-state line: "Nothing read yet.", "No memory files in context.", "No thinking captured yet.", "No blind spots."
- **F08-R8** Each file row is one `Button` (`plain`, `key` = the path) whose press sets `selected` to that path. The first nine rows also carry the hotkeys `1` to `9`.
- **F08-R9** The pane offers the keys of the key map below, each as a `Button` hotkey. A key appears only once the feature behind it has shipped.
- **F08-R10** The mod picks the renderer by the element table `$.ui.resolve(e)` returned (D4): while `view` is `graph`, a table with `Raster` gets the terminal graph (F09), else one with `Svg` gets the vector graph (F10), else the list.
- **F08-R11** The mod keeps `view` in `$.state`, so it survives a hot reload and `/clear`.
- **F08-R12** The mod's `ui.render` hook matches only `{ component: 'Pane', requestId: 'cc-graph' }` (NFR-R4).

### Key map

Every key is one digit or one lowercase letter, the only hotkeys a `Button` accepts. This table is the single source for keys; NFR-A2 requires a UI test that presses each.

| Key | Action | Spec | From |
| --- | --- | --- | --- |
| `l` | List view | F08 | v0.1 |
| `g` | Graph view | F09, F10 | v0.2 |
| `1` to `9` | Select the file in that row | F08 | v0.1 |
| `x` | Clear the selection, closing the card | F11 | v0.4 |
| `m` | `@`-mention the selected file in the prompt | F11 | v0.4 |
| `w` | Ask why (one model call) | F11 | v0.4 |
| `o` | Open the selected file in the editor | F11 | v0.4 |
| `p` | Previous turn | F13 | v0.6 |
| `n` | Next turn | F13 | v0.6 |
| `0` | Back to live | F13 | v0.6 |
| Esc | Close the pane (the engine's `closeOnEscape`) | F08 | v0.1 |
| Tab, arrows | Walk the rows and buttons (the engine's focus ring) | F08 | v0.1 |

## Acceptance criteria

- **F08-AC1** On `terminal` and on `desktop`, `/graph` opens the pane, and an empty graph shows "Nothing read yet."
- **F08-AC2** After steps 1 to 6 of the reference session, the Files section lists, top down: `● src/middleware/rateLimit.ts`, `● src/config.ts`, `● src/db/redis.ts`, `● src/auth/sessions.ts`, `◌ src/auth/password.ts`, `● src/auth/login.ts`, `◐ src/routes/index.ts`.
- **F08-AC3** At `bodyColumns` 40, no drawn row is wider than 40 columns.
- **F08-AC4** Pressing `l` then `g` switches views, and the choice survives a second `session.start` (a hot reload).
- **F08-AC5** On `vscode` and on `mobile`, with `view: 'graph'`, the list is drawn.
- **F08-AC6** Pressing `3` sets `selected` to the third file row's path.
- **F08-AC7** Given `$.ui.open` resolves `{ isPlaced: false, reason: 'needs 144 columns, has 100' }`, then a toast shows that reason.
- **F08-AC8** Given no surface is attached and the graph at RS-1, then `/graph` opens no pane and answers a text holding the meter line and "1 read, 1 partial, 1 search".
- **F08-AC9** Pressing the row `Button` keyed `src/auth/login.ts` sets `selected` to `src/auth/login.ts`.
- **F08-AC10** At `bodyColumns` 30, the row for `src/middleware/rateLimit.ts` shows a path that starts with "…" and ends with `rateLimit.ts`.

## Implementation decisions

- **The pane is the only window.** One pane id, one `ui.render` hook, one renderer chosen per surface. The card (F11) and the timeline (F13) are parts of the same tree, not more panes.
- **Rows are buttons.** A plain `Button` per row is pressable by click on the desktop and in the fullscreen terminal, and reachable with Tab everywhere, so selection works without any `Client` code. Digits are a shortcut on top.
- **The list is complete.** Every fact the graph draws is in the list (NFR-A3), so choosing the list never costs information.
- **Asked, not unasked.** A pane opened from the person's own command is placed at any width; one a mod opens unasked needs 144 columns. So the pane only opens on `/graph` (UX-Q1 asks whether to offer more).
- **Text fallback.** In `claude -p` and the SDK nothing draws, but the command still runs, so it answers with what it would have shown.
- **`columns: 64`** asks the dock for a width that fits a path, a badge and a size; the person's own drag always wins.

## Testing decisions

- **Seam:** the engine test kit's UI noun. `$.ui.mount({ plugin: 'cc-graph', surface, component: 'Pane', requestId: 'cc-graph', props })` with `bodyColumns`, `scroll` and `placement`, in a loop over `['terminal', 'desktop'] as const` and, for F08-AC5, `vscode` and `mobile`. Rows are found by key and text with `find`; keys are pressed with `press`.
- `/graph` is run with `$.command.run({ command: 'graph', args })`; the test's own hooks beneath answer `ui.open`, `ui.toast` and `session.surfaces`.
- Width is measured in terminal columns over every drawn text (F08-AC3, AC10).

## Mods API used

| Need | Event or method |
| --- | --- |
| Command | `$.command.register({ name: 'graph', description, argumentHint, immediate: true })` in `session.start`; `command.run` matched to `{ command: 'graph' }`, answered with `{ text }` |
| Pane | `$.ui.open({ id: 'cc-graph', title, focus: true, closeOnEscape: true, columns: 64 })` → `{ isPlaced, reason? }` |
| Drawing | `ui.render` on `{ component: 'Pane', requestId: 'cc-graph' }`; props `bodyColumns`, `scroll.bodyRows`, `placement` |
| Elements | `$.ui.resolve(e)` → `Box`, `Text`, `Button` (`key`, `plain`, `hotkey`, `onPress`) |
| Surfaces | `$.session.surfaces()` |
| Notice | `$.ui.toast(text)` |

## Data model changes

Adds the `view` and `selected` keys.

## Manual check

1. Run `claude --plugin-dir <this repository>` in a copy of `fixtures/sample-app` at 160 columns. `/graph` opens the pane showing "Nothing read yet."
2. Run the F01 manual sequence. Rows appear newest first.
3. Narrow the terminal. Rows shorten from the start of the path and never wrap.
4. Press Tab and Enter on a row, then press `3`: each selects a row.
5. Open the desktop app on the same folder and repeat step 1; click a row.
6. Run `claude -p "/graph"` in the same folder: it prints the text summary.

## Out of scope

- More than one pane, and a band above the prompt.
- Sorting and filtering the list. Newest first answers "what just happened"; the graph answers "how it hangs together".

## Open questions

None. UX-Q1 (offer to open by itself on wide terminals) is a product question in [00 Product](../../00-product/spec.md#open-questions-cross-cutting) and does not block this spec.

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Checked against the 2.1.296 types. Added the key map (every key a digit or lowercase letter, the only hotkeys a `Button` takes), rows as plain buttons, renderer choice by element table, the text summary where nothing draws, the `isPlaced: false` reason, and path cutting.
