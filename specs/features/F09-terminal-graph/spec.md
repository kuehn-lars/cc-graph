# F09 Terminal graph and layout

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Approved | v0.2 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | F04, F06, F08 |

## Problem

A list says what Claude saw but not how it hangs together: which files cluster, what depends on a change, where the ghosts sit. In a terminal there is no canvas to draw that on, and a graph whose nodes jump around every time a file is added is unreadable.

## Solution

In the terminal the pane draws the graph itself: a grid of coloured cells, each file one cell holding its list glyph, joined by edges drawn at twice the vertical resolution, laid out so files from the same folder sit together and a node keeps its place as the graph grows. States, rings and blind edges read at a glance, a legend names what is on screen, and a node Claude just touched pulses once.

## User stories

1. As a terminal user, I want a real graph drawn in the pane, so that I see the shape of what Claude touched without leaving the terminal.
2. As a developer, I want files from the same folder grouped, so that the graph mirrors the project.
3. As a developer, I want each file to keep its place as the graph grows, so that I can follow it across turns.
4. As a developer, I want labels only where they help, so that the graph stays readable in a small pane.
5. As a developer, I want a legend for what is on screen, so that I never have to remember the encoding.
6. As a developer, I want a touched node to pulse once, so that my eye finds what just happened.

## Requirements

- **F09-R1** While `view` is `graph` and the element table has `Raster`, the mod draws, top down: the header (the view keys and the meter line, as the list draws them), one `Raster` keyed `graph`, the legend line, and the footer notes. The `Raster` is `bodyColumns` wide and as tall as `scroll.bodyRows` less the rows of the header, legend and footer notes (at most 512 by 256). Edges use half blocks for twice the vertical resolution: `▀` with the top pixel as foreground and the bottom as background, and `▄` with the bottom pixel as foreground where only the bottom pixel is lit (a `▀` there would paint the unlit top in the terminal's foreground).
- **F09-R2** If fewer than 8 rows remain for the graph, then the mod draws the list instead and says "Graph needs a taller pane" in the footer.
- **F09-R3** The layout is a force layout on a 100 × 64 canvas, seeded by the folder that holds each node (the path up to its last `/`; a file at the root has the empty folder). A folder's seed point comes from a hash of its name, and a new node starts at its folder's seed point offset by a hash of its path, so no two new nodes start on one point. The same nodes, edges and earlier positions give the same positions.
- **F09-R4** A layout pass runs only when nodes or edges were added or removed, off the hook's return path (D5), with at most 200 iterations, and moves no existing node more than 2 units. It drops the positions of nodes no longer in the graph and writes the `layout` key only.
- **F09-R5** Each file node is one cell holding its list glyph (02 Data model) in its state's colour; a node with a change paints that cell's background in its ring colour (02, Changes). Memory files are `■` cells in one row along the canvas's bottom-left, in path order, outside the force layout and the `layout` key. Import edges are lines of half-block pixels between node cells. Decisions as violet `◆` cells (F12, from v0.6) and blind edges as dashed red lines (F07, from v0.3) are drawn once those features ship.
- **F09-R6** The mod labels only the selected node, changed nodes and the 5 largest nodes by tokens, each with its file name, to the right of its cell. A label that would overlap a drawn label or leave the raster is dropped, in that priority order. A character of a label that is not one column wide in the Basic Multilingual Plane is drawn as `?`, so the `Raster` is never refused.
- **F09-R7** When a node is touched while the graph is shown, the mod repaints a ring of highlighted cells around it through `$.ui.blit` once the off-path queue has placed it, and clears the ring with a second blit 1000 ms later, both without a render pass. A render in between ends the pulse early; a denied blit is ignored.
- **F09-R8** A legend line under the graph names every glyph and ring that is on screen, and no other, each ring by its colour and change word ("amber edited").
- **F09-R9** The renderer reads positions from `layout` and never runs layout itself; a node without a position yet is drawn at its folder's seed point.
- **F09-R10** In the list, the row of a file that imports others ends with "imports ‹n›", and a ghost's row says "imported by ‹file name›" of its most recently touched importer, followed by "+‹n›" for each further one, so every edge the graph draws is also in the list (NFR-A3).

## Acceptance criteria

- **F09-AC1** The same nodes and edges give the same positions on two runs.
- **F09-AC2** Adding one node to a 30-node graph moves no existing node more than 2 units.
- **F09-AC3** A layout pass over 60 nodes and 120 edges finishes in under 50 ms on CI.
- **F09-AC4** On `terminal`, the mounted `Raster`'s `cells` decodes to exactly `columns × rows` cells.
- **F09-AC5** On `desktop` the terminal renderer is never used.
- **F09-AC6** Given two labels that would overlap, only the higher-priority one is drawn (selected, then changed, then largest).
- **F09-AC7** Given `bodyRows` leaves 6 rows for the graph, then the list is drawn and the footer says "Graph needs a taller pane".
- **F09-AC8** Given the reference session after step 8 with `blindSpots` and `decisions` off, then the legend names `●`, `◐`, `◌`, `■` and the amber and green rings, and none of `○`, `!`, `⋯`, `◆` or the blind edge.
- **F09-AC9** Given a `Read` while the graph is mounted, when the queue has run, then one `$.ui.blit` for key `graph` is made, a second follows 1000 ms later, and neither adds a render pass.
- **F09-AC10** Given the reference session after step 2, then the row of `src/auth/login.ts` ends with "imports 2", and the rows of `src/auth/password.ts` and `src/auth/sessions.ts` say "imported by login.ts".
- **F09-AC11** Given the selected node `src/日本.ts`, then the `Raster` is drawn and its label reads `??.ts`.
- **F09-AC12** Given a node with a position is evicted, when the next layout pass has run, then `layout` holds no position for it.

## Implementation decisions

- **A node is its glyph.** At half-block resolution a disc is three pixels, too small for 02's outlines, fills and sizes, which the vector graph (F10) draws. One cell with the list's glyph reads at a glance and makes the legend name the same glyphs as the list. Size by tokens shows only through the labels of the 5 largest. A subagent-only node draws like any other; its list row says "agent".
- **Memory sits apart.** Memory files have no edges and live in their own key, so they take a fixed row instead of a place in the force layout.
- **Layout lives in `layout`, positions in their own key.** The layout is pure and seeded; the queue runs it after writes that add nodes or edges and stores the result in `layout`. Rendering only reads, so a redraw never pays for layout (NFR-P4), and the timeline (F13) replays with live positions.
- **Bounded movement.** Capping each pass at 2 units per existing node trades a perfect layout for stability: people track positions, not energy minima.
- **Half blocks.** `▀` with two colours doubles the vertical resolution, so circles look round in a terminal's tall cells.
- **Pulse by blit.** `$.ui.blit` repaints the mounted raster at the frame rate without a render pass, so the pulse costs no tree build. A blit must carry the whole frame at the mounted size, so the wiring keeps the size of the raster it last drew. The pulse waits for the queue, because the layout write that places a new node redraws the pane and would wipe an earlier ring. It runs only while the raster is mounted.

## Testing decisions

- **Secondary seam:** unit tests for the layout's determinism, stability and timing (F09-AC1 to AC3).
- **Primary seam:** UI tests mount the pane on `terminal` and `desktop` and decode the `Raster`'s `cells` (F09-AC4 to AC8, AC10, AC11); the encoder is in `render`, so it is tested only through the mount (D8). Event tests advance `mock.clock` for the queue (F09-AC12, NFR-P4); the test's own hook beneath `ui.blit` counts blits (F09-AC9). NFR-P3's benchmark mounts a 60-node, 120-edge graph.

## Mods API used

| Need | Event or method |
| --- | --- |
| Graph | `Raster` from `$.ui.resolve(e)` (terminal only): `key`, `columns` 1 to 512, `rows` 1 to 256, `cells` as packed base64 of `[codePoint, foreground, background]` |
| Room | Pane props `bodyColumns`, `scroll.bodyRows` |
| Pulse | `$.ui.blit({ requestId: 'cc-graph', key: 'graph', cells, columns, rows })` |
| Off-path layout, pulse timing | `$.clock.after` (ARCH-Q1) |

## Data model changes

Adds the `layout` key (`Point` per node id).

## Manual check

1. In a copy of `fixtures/sample-app`, open `/graph`, press `g`, and run the reference session's turn 1.
2. Nodes appear grouped by folder and keep their place as new files arrive.
3. A newly touched node pulses once.
4. Check against the golden graph in [04](../../04-reference-session/spec.md): states, rings and import edges read the same (the blind edge follows with F07).
5. Shrink the pane until the list takes over, and widen it again.

## Out of scope

- Pointer selection on the raster: `Raster` takes no presses. Rows and keys select (F08); a pointer overlay is F10's spike S3.
- `Image` with the kitty graphics protocol. It would draw a sharper graph in some terminals only; a later idea in the roadmap.
- Panning and zooming.

## Open questions

None.

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Checked against the 2.1.296 types. Positions moved to the `layout` key and the pass off the return path; added the minimum height, the legend rule, pulse by blit without a render pass, and a canvas unit for layout limits.
- 2026-10-13 Ticketing, checked again against the 2.1.296 types and the v0.1 code. A node is one cell with its list glyph, a change its background (R5); clusters seed by the parent folder, not the top-level one, which put the whole sample app in one cluster (R3); memory files take a fixed row (R5); the header and footer notes count against the raster's rows (R1); a pass also drops removed nodes (R4, AC12); labels replace characters a `Raster` refuses (R6, AC11); the pulse waits for the queue and clears with a second blit (R7, AC9); decisions and blind edges wait for F12 and F07 (R5); the list names imports so NFR-A3 holds (R10, AC10); AC4 is tested through the mount, not a unit test of `render` (D8). Approved by the owner.
- 2026-10-13 Ticket 01: the renderer choice also asks for `e.surface === 'terminal'`, since the test kit's table holds `Raster` on every surface (F08-R10, D4).
- 2026-10-13 Ticket 03: R1 allows `▄` for a cell with only its bottom pixel lit; `▀` would paint the unlit top half in the terminal's foreground colour. Approved by the owner.
