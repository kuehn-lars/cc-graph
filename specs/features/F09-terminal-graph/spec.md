# F09 Terminal graph and layout

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Review | v0.2 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | F06, F08 |

## Problem

A list says what Claude saw but not how it hangs together: which files cluster, what depends on a change, where the ghosts sit. In a terminal there is no canvas to draw that on, and a graph whose nodes jump around every time a file is added is unreadable.

## Solution

In the terminal the pane draws the graph itself: a grid of coloured cells at twice the vertical resolution, laid out so files from the same folder sit together and a node keeps its place as the graph grows. States, rings and blind edges read at a glance, a legend names what is on screen, and a node Claude just touched pulses once.

## User stories

1. As a terminal user, I want a real graph drawn in the pane, so that I see the shape of what Claude touched without leaving the terminal.
2. As a developer, I want files from the same folder grouped, so that the graph mirrors the project.
3. As a developer, I want each file to keep its place as the graph grows, so that I can follow it across turns.
4. As a developer, I want labels only where they help, so that the graph stays readable in a small pane.
5. As a developer, I want a legend for what is on screen, so that I never have to remember the encoding.
6. As a developer, I want a touched node to pulse once, so that my eye finds what just happened.

## Requirements

- **F09-R1** While `view` is `graph` and the element table has `Raster`, the mod draws one `Raster` keyed `graph`, `bodyColumns` wide and as tall as `scroll.bodyRows` less the rows of the header and legend (at most 512 by 256), using upper half blocks (`▀`, foreground the top pixel, background the bottom) for twice the vertical resolution.
- **F09-R2** If fewer than 8 rows remain for the graph, then the mod draws the list instead and says "Graph needs a taller pane" in the footer.
- **F09-R3** The layout is a force layout on a 100 × 64 canvas, seeded by each node's top-level folder: the same nodes, edges and seed give the same positions. A new node starts at its folder's seed point.
- **F09-R4** A layout pass runs only when nodes or edges were added, off the hook's return path (D5), with at most 200 iterations, and moves no existing node more than 2 units. It writes the `layout` key only.
- **F09-R5** The mod encodes states and changes as the tables in 02 Data model give them, decisions as violet diamonds, memory files as squares in their own cluster, and blind edges as dashed red lines.
- **F09-R6** The mod labels only the selected node, changed nodes and the 5 largest nodes by tokens. A label that would overlap a drawn label or leave the raster is dropped, in that priority order.
- **F09-R7** When a node is touched while the graph is shown, the mod repaints a one-second pulse ring around it through `$.ui.blit`, without a render pass.
- **F09-R8** A legend line under the graph names every glyph and ring that is on screen, and no other.
- **F09-R9** The renderer reads positions from `layout` and never runs layout itself; a node without a position yet is drawn at its folder's seed point.

## Acceptance criteria

- **F09-AC1** The same nodes and edges give the same positions on two runs.
- **F09-AC2** Adding one node to a 30-node graph moves no existing node more than 2 units.
- **F09-AC3** A layout pass over 60 nodes and 120 edges finishes in under 50 ms on CI.
- **F09-AC4** The `cells` string decodes to exactly `columns × rows` cells.
- **F09-AC5** On `desktop` the terminal renderer is never used.
- **F09-AC6** Given two labels that would overlap, only the higher-priority one is drawn (selected, then changed, then largest).
- **F09-AC7** Given `bodyRows` leaves 6 rows for the graph, then the list is drawn and the footer says "Graph needs a taller pane".
- **F09-AC8** Given the reference session after step 8 with `blindSpots` and `decisions` off, then the legend names `●`, `◐`, `◌`, `■` and the amber and green rings, and none of `○`, `!`, `⋯`, `◆` or the blind edge.
- **F09-AC9** Given a `Read` while the graph is mounted, then one `$.ui.blit` for key `graph` is made and no extra render pass.

## Implementation decisions

- **Layout lives in `layout`, positions in their own key.** The layout is pure and seeded; the queue runs it after writes that add nodes or edges and stores the result in `layout`. Rendering only reads, so a redraw never pays for layout (NFR-P4), and the timeline (F13) replays with live positions.
- **Bounded movement.** Capping each pass at 2 units per existing node trades a perfect layout for stability: people track positions, not energy minima.
- **Half blocks.** `▀` with two colours doubles the vertical resolution, so circles look round in a terminal's tall cells.
- **Pulse by blit.** `$.ui.blit` repaints the mounted raster at the frame rate without a render pass, so the pulse costs no tree build. It runs only while the raster is mounted.

## Testing decisions

- **Secondary seam:** unit tests for the layout's determinism, stability and timing (F09-AC1 to AC3) and for the cell encoder (F09-AC4).
- **Primary seam:** UI tests mount the pane on `terminal` and `desktop` (F09-AC5, AC7, AC8); the test's own hook beneath `ui.blit` counts blits (F09-AC9). NFR-P3's benchmark mounts a 60-node graph.

## Mods API used

| Need | Event or method |
| --- | --- |
| Graph | `Raster` from `$.ui.resolve(e)` (terminal only): `key`, `columns` 1 to 512, `rows` 1 to 256, `cells` as packed base64 of `[codePoint, foreground, background]` |
| Room | Pane props `bodyColumns`, `scroll.bodyRows` |
| Pulse | `$.ui.blit({ requestId: 'cc-graph', key: 'graph', cells, columns, rows })` |
| Off-path layout | `$.clock.after` (ARCH-Q1) |

## Data model changes

Adds the `layout` key (`Point` per node id).

## Manual check

1. In a copy of `fixtures/sample-app`, open `/graph`, press `g`, and run the reference session's turn 1.
2. Nodes appear grouped by folder and keep their place as new files arrive.
3. A newly touched node pulses once.
4. Check against the golden graph in [04](../../04-reference-session/spec.md): states, rings and the blind edge read the same.
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
