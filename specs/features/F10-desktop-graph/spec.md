# F10 Desktop graph and pointer selection

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Review | v0.5 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | F08, F09, F11 |

## Problem

The desktop app can draw vector graphics, so a cell graph there wastes the medium: no smooth edges, no readable labels, no tooltips. And on any surface, people expect to click a node in a graph to learn about it.

## Solution

In the desktop app the pane draws the graph as a vector image from the same positions as the terminal graph, with real edges, labels and hover tooltips, and with a text summary for screen readers. Clicking a node selects it, on the desktop and in the fullscreen terminal, once the pointer overlay proves out; keys and list rows select everywhere regardless.

## User stories

1. As a desktop user, I want a vector graph with labels and tooltips, so that it reads like the rest of the app.
2. As a desktop user, I want to click a node to select it, so that the graph works the way a graph should.
3. As a terminal user, I want the same click in the fullscreen terminal, so that I don't have to count rows.
4. As a screen-reader user, I want a summary of the graph in words, so that the drawing is not the only way to learn it.
5. As a developer in a big session, I want changed files and blind spots never dropped from the drawing, so that size limits never hide what matters.
6. As any user, I want pointer selection to fail quietly, so that a problem in it never takes the graph or the session down.

## Requirements

- **F10-R1** While `view` is `graph` and the element table has `Svg` but not `Raster`, the mod draws one `Svg` from the positions in `layout`, scaled to the pane, with `isInteractive: true` so each node's `<title>` (path, state, change) shows on hover.
- **F10-R2** The mod keeps `source` at most 131,072 characters. When the drawing would not fit, it leaves out, in this order, ghost labels, ghost titles, ghost nodes with their edges, then labels of unchanged nodes, and the footer says how many nodes were left out. Changed nodes and blind edges are always drawn.
- **F10-R3** The mod sets `alt` to a summary: "‹n› files: ‹count› ‹state›, …; ‹count› ‹change›, …; ‹n› blind spots.", states and changes in the order of F08-R4, leaving out zero counts (NFR-A4).
- **F10-R4** Selection by keys and list rows (F08) works on every surface, whether or not pointer selection does.
- **F10-R5** If spike S3 shows that a `Client` region laid over the graph receives pointer events while the drawing beneath stays visible, then the mod draws a transparent `Client` overlay the size of the graph, on the desktop and in the fullscreen terminal, that hit-tests a pointer press against the node positions it receives as props and posts `{ select: id }`.
- **F10-R6** When a `ui.message` from the overlay carries `{ select: id }` naming an existing node or decision, the mod sets `selected` to it. Any other message changes nothing.
- **F10-R7** When `ui.fault` reports the overlay failed, the mod stops drawing the overlay for the conversation and adds the footer note "Pointer selection is off". The graph and every key keep working.
- **F10-R8** The mod draws the selected node with a halo and always labels it.

## Acceptance criteria

- **F10-AC1** For a 60-node graph, the `Svg` source is under 131,072 characters.
- **F10-AC2** A posted `{ select: 'src/a.ts' }` sets `selected` to `src/a.ts`.
- **F10-AC3** A `ui.fault` from the overlay removes the overlay, keeps the graph, adds "Pointer selection is off" to the footer, and puts nothing in the transcript.
- **F10-AC4** A posted message naming a path that is not a node changes nothing.
- **F10-AC5** For a 200-node graph with 120-character paths, the source stays within 131,072 characters, every changed node and blind edge is in it, and the footer says how many nodes were left out.
- **F10-AC6** Given the golden graph of the reference session with `decisions` off, then `alt` reads "12 files: 4 read, 5 compacted, 2 unread, 1 ghost; 1 edited, 2 created, 2 blind; 3 blind spots."
- **F10-AC7** On `terminal` the `Svg` renderer is never used.

## Implementation decisions

- **Same positions as the terminal.** Both renderers read `layout`, so a file sits in the same place on every surface and in the timeline.
- **`Svg` cannot be clicked, and a `Client` cannot draw `Svg`.** The 2.1.296 types make `isInteractive` a script-less frame (hover and tooltips only), and a `Client` module's element table leaves out `Svg`, `Raster` and `Image`. The only route to pointer selection on the drawing is a transparent `Client` stacked over it, hence spike S3. If it fails, list rows remain clickable on the desktop (F08) and nothing is lost.
- **A fault drops the overlay, not the graph.** The earlier draft fell back to the list on any fault; the overlay is the only part that can fault, so only it goes.
- **Drop ghosts first.** Ghosts are context; changed files and blind spots are the point. Under the size limit the least informative marks go first.

## Testing decisions

- **Seam:** UI tests mount the pane on `desktop` and `terminal` and read the `Svg` `source` and `alt` (F10-AC1, AC5, AC6, AC7).
- Overlay tests use the kit's `Client` acts: `post` from the overlay for F10-AC2 and AC4; a module that throws for F10-AC3, which the kit reports as `ui.fault`.
- Spike S3 is a throwaway probe mod; its notes go next to this spec before it is Approved.

## Mods API used

| Need | Event or method |
| --- | --- |
| Graph | `Svg` from `$.ui.resolve(e)`: `source` (at most 131,072 characters), `alt` (required), `isInteractive` |
| Pointer | `Client` (`key`, `module`, `props`, `width`, `height`) whose module uses `surface.onPointer` and `surface.post` |
| Clicks | `ui.message`: `element`, `data` |
| Failure | `ui.fault`: `element`, `phase`, `reason` |

## Data model changes

None.

## Manual check

1. Open a copy of `fixtures/sample-app` in the desktop app's Code tab with the mod loaded, and run the reference session's turn 1.
2. `/graph`, then `g`: the vector graph draws; hovering a node shows its path and state.
3. Click a node: its card opens (F11). Keys `1` to `9` still select rows.
4. In a fullscreen terminal, click a node on the raster graph.
5. Turn on a screen reader on the desktop and read the graph's summary.

## Out of scope

- Dragging nodes, panning and zooming.
- Animations in the `Svg` beyond hover.

## Open questions

- [ ] **F10-Q1** Does a transparent `Client` region stacked over the graph (a `Box` with `position: 'absolute'` holding the `Client`) receive pointer events on the desktop and in the fullscreen terminal while the `Svg` or `Raster` beneath stays visible? Spike S3 at the start of v0.5. If not, F10-R5 is struck and pointer selection stays on list rows.

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Checked against the 2.1.296 types: `Svg` takes no clicks and a `Client` cannot draw `Svg`, so F10-Q1 narrowed to an overlay. Added the size-limit drop order, the `alt` summary, terminal pointer selection, and a fault that drops only the overlay.
