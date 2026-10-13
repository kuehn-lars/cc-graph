# F09 Terminal graph and layout

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Approved | v0.2 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | F04, F06, F08 |

## Problem

A list says what Claude saw but not how it hangs together: which files depend on a change, where the ghosts sit, what Claude is touching right now. In a terminal there is no canvas to draw that on, and a graph of one-cell glyphs joined by block staircases, scattered at random, says nothing at all: nodes are dots, edges merge into blobs, and most files have no name on screen.

## Solution

In the terminal the pane draws the graph on a dark card, in braille dots: each file a shape that says its state (a filled disc in context, a hollow ring compacted, a cross never opened), sized by what it costs, ringed in the colour of its change, and named. Importers sit above what they import, so the graph reads top down. The file Claude just touched wears a halo, its edges light up, a ripple runs out from it once, and a line under the card says what it is. A header meters the context, and a legend names only what is on screen.

## User stories

1. As a terminal user, I want a real graph drawn in the pane, so that I see the shape of what Claude touched without leaving the terminal.
2. As a developer, I want every file named on the graph, so that I never have to guess what a shape is.
3. As a developer, I want to see what is in context at a glance, so that filled, hollow and crossed-out files tell me what Claude knows without reading.
4. As a developer, I want importers above what they import, so that dependencies read top down like a diagram.
5. As a developer, I want the file Claude just touched to stand out, with its edges, so that I can follow what is happening while the turn runs.
6. As a developer, I want the size of a change next to the file, so that I see how much Claude edited without opening the list.
7. As a developer, I want bigger files drawn bigger, so that I see where the context goes.
8. As a developer, I want each file to keep its place as the graph grows, so that I can follow it across turns.
9. As a developer, I want the graph to use the whole card, so that a small graph is not a cluster in a corner.
10. As a developer, I want a header that meters the context in words and a bar, so that I know how full the window is.
11. As a developer, I want a legend for what is on screen only, so that I never have to remember the encoding.
12. As a developer, I want memory files named under the graph, so that I see what instructions are loaded.
13. As a developer with a narrow pane, I want the graph to scale down and fall back to the list, so that it never draws garbage.
14. As a colour-blind developer, I want every state and change told by a shape or a word as well as a colour, so that nothing depends on colour alone.
15. As a developer, I want the same facts in the list, so that choosing the list never costs me information.

## Requirements

- ~~**F09-R1** While `view` is `graph` and the element table has `Raster`, the mod draws, top down: the header (the view keys and the meter line, as the list draws them), one `Raster` keyed `graph`, the legend line, and the footer notes. The `Raster` is `bodyColumns` wide and as tall as `scroll.bodyRows` less the rows of the header, legend and footer notes (at most 512 by 256). Edges use half blocks for twice the vertical resolution: `▀` with the top pixel as foreground and the bottom as background, and `▄` with the bottom pixel as foreground where only the bottom pixel is lit (a `▀` there would paint the unlit top in the terminal's foreground).~~ Replaced by R11 and R12.
- **F09-R2** If fewer than 8 rows remain for the graph, then the mod draws the list instead and says "Graph needs a taller pane" in the footer.
- ~~**F09-R3** The layout is a force layout on a 100 × 64 canvas, seeded by the folder that holds each node (the path up to its last `/`; a file at the root has the empty folder). A folder's seed point comes from a hash of its name, and a new node starts at its folder's seed point offset by a hash of its path, so no two new nodes start on one point. The same nodes, edges and earlier positions give the same positions.~~ Replaced by R13.
- **F09-R4** A layout pass runs only when nodes or edges were added or removed, off the hook's return path (D5), with at most 200 iterations, and moves no existing node more than 2 units. It drops the positions of nodes no longer in the graph and writes the `layout` key only.
- ~~**F09-R5** Each file node is one cell holding its list glyph (02 Data model) in its state's colour; a node with a change paints that cell's background in its ring colour (02, Changes). Memory files are `■` cells in one row along the canvas's bottom-left, in path order, outside the force layout and the `layout` key. Import edges are lines of half-block pixels between node cells. Decisions as violet `◆` cells (F12, from v0.6) and blind edges as dashed red lines (F07, from v0.3) are drawn once those features ship.~~ Replaced by R14, R15 and R16.
- ~~**F09-R6** The mod labels only the selected node, changed nodes and the 5 largest nodes by tokens, each with its file name, to the right of its cell. A label that would cover a node's cell, a memory cell or a drawn label, or leave the raster, is dropped, so no glyph is erased (NFR-A3); labels are placed in that priority order. A character of a label that is not one column wide in the Basic Multilingual Plane is drawn as `?`, so the `Raster` is never refused.~~ Replaced by R17.
- ~~**F09-R7** When a node is touched while the graph is shown, the mod repaints a ring of highlighted cells around it through `$.ui.blit` once the off-path queue has placed it, and clears the ring with a second blit 1000 ms later, both without a render pass. A render in between ends the pulse early; a denied blit is ignored.~~ Replaced by R19.
- ~~**F09-R8** A legend line under the graph names every glyph and ring that is on screen, and no other, each ring by its colour and change word ("amber edited").~~ Replaced by R20.
- **F09-R9** The renderer reads positions from `layout` and never runs layout itself; a node without a position yet is drawn at its folder's seed point.
- **F09-R10** In the list, the row of a file that imports others ends with "imports ‹n›", and a ghost's row says "imported by ‹file name›" of its most recently touched importer, followed by "+‹n›" for each further one, so every edge the graph draws is also in the list (NFR-A3).
- **F09-R11** While `view` is `graph` and the element table has `Raster` on `terminal`, the mod draws, top down: the view keys row, led by "CC Graph" in bold and "what Claude knows" dimmed; the meter line (R21); one `Raster` keyed `graph`, the card; the now line (R18); two legend lines (R20); and the footer notes. The `Raster` is `bodyColumns` wide and as tall as `scroll.bodyRows` less the rows of everything else (at most 512 by 256).
- **F09-R12** The card fills the `Raster`. Its top row is `▗`, then `▄` up to the last cell, then `▖`; its bottom row is `▝`, `▀`…, `▘`; all of them in the card colour on the terminal's default background, so the card has rounded corners and no border line. Every other cell has the card colour as background, and its first and last columns stay empty. The cells between are the dot area, drawn in braille: each cell holds 2 × 4 dots (U+2800 plus the bits of its lit dots), so the area is `(columns − 2) × 2` dots wide and `(rows − 2) × 4` tall. A cell takes the colour of its most important lit dot, in this order: selected ring and pulse, change ring, node body, halo, blind edge, decision edge, lit edge, edge. A cell with no lit dot holds a grid `·` in the grid colour when its column within the dot area is a multiple of 4 and its row is even, else a space.
- **F09-R13** The layout is a force layout on a 100 × 64 canvas. Nodes repel, except the two ends of an import edge, whose distance only the edge sets: it pulls them toward 14 units apart, and an import edge whose importer is not at least 10 units above the file it imports pushes the two apart vertically, so importers settle above. A weak pull toward the seed point of a node's folder (the path up to its last `/`; a file at the root has the empty folder; the point from a hash of the folder's name) keeps folders together. A node with no position starts 8 units below its most recently touched placed importer, or else 8 units above the most recently touched placed file it imports, or else at its folder's seed point, offset sideways by a hash of its path, so no two new nodes start on one point. A node with no earlier position moves freely in its first pass; R4 bounds every other. The same nodes, edges and earlier positions give the same positions.
- **F09-R14** The card maps positions onto the dot area by one scale on both axes: the bounding box of every drawn file node's position, padded by 8 units each side and at least 40 × 26 units, centred in the dot area as large as it fits. A node is clamped so its outermost ring stays inside the dot area.
- **F09-R15** Each file node is drawn in dots around its mapped position, its shape by its state: `read` a filled disc and `partial` a disc outline with its left half filled, both in the in-context colour; `search` a dotted circle (every other dot) in the search colour; `compacted` a circle outline in grey; `unread` an exclamation mark (a vertical bar, a gap, a dot) in grey; `ghost` a cross of two diagonals in the ghost colour. The radius is `2 + round(7 × √(tokens / largest tokens))` dots, 3 where tokens are unknown and 2 for a ghost, scaled by `columns / 84` in a `Raster` under 84 columns, at least 2. A node with a change carries a one-dot ring of its change's colour 3 dots outside its radius (02, Changes); the selected node a white ring 2 dots outside that (or 3 dots outside its radius without a change). Decisions (F12, from v0.6) are filled violet diamonds.
- **F09-R16** Import edges are dotted lines (every other dot along a straight line) from 3 dots outside one node's outermost ring to 3 dots outside the other's. The focus node is the selected node, or else the now node (R18); its edges are drawn in the lit edge colour and every other edge in the edge colour, and it wears a dotted halo 4 dots outside its outermost ring. Blind edges (F07, from v0.3) are red dashes of 3 dots with gaps of 3; decision edges (F12, from v0.6) are dotted violet.
- **F09-R17** Every file node is labelled on the cell row of its centre, two columns right of its outermost ring (its halo, if focused): its file name, in the text colour for `read`, `partial` and `search` and in the dimmed colour otherwise, the now node's in bold; then, for a node with a change, two spaces and its change word in its change's colour: `+‹added› −‹removed›` for `edited`, `+‹added› new` for `created`, `changed` for `external`, `changed unseen` for `blind`. A label covers edge dots and the grid, never a node's dots or another label, and never leaves the dot area: one that would is placed two columns left of the node instead, ending there, and dropped if that fails too. Labels are placed in this order: the selected node, the now node, changed nodes newest first, then the rest by tokens, largest first, then by path. A character of a label that is not one column wide in the Basic Multilingual Plane is drawn as `?`, so the `Raster` is never refused.
- **F09-R18** The now line under the card names the now node, the node that is not a ghost with the highest `touched`: `◉ now`, its path (folder dimmed, file name bold), its change word as R17 colours it, and then `· ` and its list words from R10 when it has any. With no such node it says "Nothing read yet."
- **F09-R19** When a node is touched while the graph is shown, the mod repaints the card through `$.ui.blit` once the off-path queue has placed it, four times without a render pass: with a white ring 4 dots outside its outermost ring, 120 ms later with a ring 6 dots outside in the halo colour, 240 ms later with a dotted ring 8 dots outside in the faint colour, and 400 ms later without a ring. A render in between ends the pulse early; a denied blit is ignored.
- **F09-R20** The first legend line names each node shape on the card, and no other, in the order of R15: `●` in context, `◐` partly read, `◌` search hits only, `○` compacted, `!` unread, `✕` never opened, and `◆` decision once F12 ships; each mark in its shape's colour and each word dimmed. The second names each change ring on the card after "rings", each word in its colour (`edited`, `created`, `changed`, `changed unseen`), and then "memory" and the memory files' paths as the `memory` key holds them, in path order, separated by " · ". Either part is left out when it has nothing; a line cut by the pane ends in "…".
- **F09-R21** The meter line reads: a bar of 16 `━`, the first `max(1, round(percent × 16 / 100))` in the in-context colour and the rest in the grid colour, then `‹percent›% of ‹window›` (F03-R5a's form, a million or more as `1M`); then two spaces, `≈‹tokens› tokens`, `‹n› files` (the in-context files with known tokens, as F03-R5 counts them), `‹n› compacted` and `‹n› changed unseen` (nodes whose change is `blind`) in red, separated by " · ", a count of zero left out. Without a percent the bar and `of ‹window›` give way to "window –". Numbers are in the text colour and words dimmed; a line wider than the pane is cut from its end and closed by "…".
- **F09-R22** The colours are fixed, not the person's theme: card `#14161b`, grid `#262a31`, in context `#7aa7ff`, search `#5fc4d6`, grey `#5f6672`, ghost `#7d8590`, edge `#353a42`, lit edge `#8a94a3`, edited `#f0b45a`, created `#63d494`, changed `#9aa3ae`, changed unseen and blind edges `#ff6b72`, decision `#b89aff`, decision edge `#5d4d91`, halo `#9aa4b1`, selected and pulse `#f0f3f6`, faint `#6b7380`, text `#eef1f5`, dimmed `#9aa3ae`.

## Acceptance criteria

- **F09-AC1** The same nodes and edges give the same positions on two runs.
- **F09-AC2** Adding one node to a 30-node graph moves no existing node more than 2 units.
- **F09-AC3** A layout pass over 60 nodes and 120 edges finishes in under 50 ms on CI.
- **F09-AC4** On `terminal`, the mounted `Raster`'s `cells` decodes to exactly `columns × rows` cells.
- **F09-AC5** On `desktop` the terminal renderer is never used.
- ~~**F09-AC6** Given a changed node whose label would cover the cell of the selected node to its right, only the selected node's label is drawn.~~ Replaced by AC19.
- **F09-AC7** Given `bodyRows` leaves 6 rows for the graph, then the list is drawn and the footer says "Graph needs a taller pane".
- ~~**F09-AC8** Given the reference session after step 8 with `blindSpots` and `decisions` off, then the legend names `●`, `◐`, `◌`, `■` and the amber and green rings, and none of `○`, `!`, `⋯`, `◆` or the blind edge.~~ Replaced by AC23.
- ~~**F09-AC9** Given a `Read` while the graph is mounted, when the queue has run, then one `$.ui.blit` for key `graph` is made, a second follows 1000 ms later, and neither adds a render pass.~~ Replaced by AC24.
- **F09-AC10** Given the reference session after step 2, then the row of `src/auth/login.ts` ends with "imports 2", and the rows of `src/auth/password.ts` and `src/auth/sessions.ts` say "imported by login.ts".
- **F09-AC11** Given the selected node `src/日本.ts`, then the `Raster` is drawn and its label reads `??.ts`.
- **F09-AC12** Given a node with a position is evicted, when the next layout pass has run, then `layout` holds no position for it.
- **F09-AC13** Given an 84 × 24 `Raster`, then its first row is `▗`, 82 × `▄`, `▖` and its last `▝`, 82 × `▀`, `▘`, all in `#14161b` on the default background; every other cell has background `#14161b`; and no cell holds `▀` or `▄` outside those two rows.
- **F09-AC14** Given `src/a.ts` (`read`, 400 tokens) alone on the card, then the cell at its centre is `⣿` in `#7aa7ff`, and the dots around it form a disc of radius 9.
- **F09-AC15** Given `src/a.ts` `read` and `src/b.ts` `compacted`, both 400 tokens, then the centre cell of `src/b.ts` holds no dot and the dots 9 to the left and right of its centre are lit in `#5f6672`; given `src/c.ts` a `ghost`, the dots at its centre and on both diagonals are lit in `#7d8590`.
- **F09-AC16** Given `src/auth/login.ts` `edited +2 −0`, then dots in `#f0b45a` sit 3 dots outside its radius, and its label reads `login.ts  +2 −0` with `+2 −0` in `#f0b45a`; given `src/middleware/rateLimit.ts` `created +12`, its label reads `rateLimit.ts  +12 new` in `#63d494` after the name.
- **F09-AC17** Given 5 file nodes placed apart on an 84 × 24 card, then the decoded rows hold all 5 file names.
- **F09-AC18** Given a node mapped within 6 columns of the card's right edge, then its label ends two columns left of its outermost ring.
- **F09-AC19** Given a changed node whose label would cover the dots of the selected node to its right, and no room on its left, then the selected node's label is drawn and the changed node's is not.
- **F09-AC20** Given `test/login.test.ts` touched last and importing `src/auth/login.ts` and `test/helpers.ts`, with `src/auth/login.ts` also importing `src/auth/password.ts`, then the edge dots from `login.test.ts` are `#8a94a3`, those from `login.ts` to `password.ts` are `#353a42`, and dotted `#9aa4b1` dots circle `login.test.ts`.
- **F09-AC21** Given the reference session after step 2, then the now line reads `◉ now  src/auth/login.ts  · imports 2`; given an empty graph, it reads "Nothing read yet."
- **F09-AC22** Given 3 `read` files of 100 tokens each, 1 `compacted` and 1 node with change `blind`, and a fill of 6% of 1,000,000, then the meter line reads `━━━━━━━━━━━━━━━━ 6% of 1M  ≈300 tokens · 3 files · 1 compacted · 1 changed unseen`, with the first `━` in `#7aa7ff` and `1 changed unseen` in `#ff6b72`.
- **F09-AC23** Given the reference session after step 8 with `blindSpots` and `decisions` off, then the first legend line reads `● in context  ◐ partly read  ◌ search hits only` and the second `rings  edited · created  memory  CLAUDE.md · src/auth/CLAUDE.md`, and neither names `○`, `!`, `✕`, `◆` or `changed`.
- **F09-AC24** Given a `Read` while the graph is mounted, when the queue has run, then four `$.ui.blit`s for key `graph` are made, at 0, 120, 240 and 400 ms, the first with `#f0f3f6` dots 4 dots outside the node and the last with none outside its halo, and none adds a render pass.
- **F09-AC25** Given a new chain `src/routes/index.ts` → `src/auth/login.ts` → `src/auth/sessions.ts`, when one pass has run, then each importer is at least 10 units above the file it imports.
- **F09-AC26** Given `src/auth/login.ts` placed at (50, 30) and a new ghost `src/api/users.ts` importing it, when one pass has run, then `src/api/users.ts` is within 16 units of `src/auth/login.ts`.
- **F09-AC27** Given one node, it is drawn at the centre of the dot area, whatever its position; given two nodes 10 units apart on the same row, they are drawn the same number of dots from the centre on either side.

## Implementation decisions

- **Braille, not half blocks.** A braille cell is 2 × 4 dots with a dark gap around each, so dots read as pixels with an outline and a cell's dots are square on a terminal's tall cells. That is four times the half blocks' resolution, enough for discs, rings and crosses that say a state by shape (NFR-A1), which the one-cell glyph could not. A braille cell has one colour, so where a ring and a body share a cell the ring wins (R12's order); the 2-dot gap between them keeps that rare. The bits of a cell, from the prototype: `[[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]][dotRow][dotColumn]`, added to U+2800.
- **The card, not a border.** A tonal panel with half-block corners separates the graph from the conversation without a box-drawing line. It is the only place half blocks remain. The card is dark in every theme, so the palette is fixed (R22) rather than theme keys, which name no blues or ambers; in a light theme the card reads as a screen.
- **One focus.** The selected node, or else the one Claude touched last, is the focus: a halo, lit edges, a bold label, and the now line saying it in words. Everything else recedes, so the eye lands on what is happening.
- **Flow without arrows.** Arrowheads do not survive braille at this size. Pushing importers above what they import makes direction readable from position alone, as a layered diagram would, while keeping the force layout's stability.
- **New nodes settle freely.** The 2-unit cap of R4 is for nodes people have seen. A node arriving starts by its importer (or importee) and moves freely in its first pass; capping it too left every node where its folder's hash put it, which is why the first graph looked random.
- **Fit to view at render time.** Positions stay in canvas units in `layout`; the renderer scales their bounding box onto the dot area, one scale for both axes. A two-node graph fills the card instead of sitting in a corner, and the work is linear, so NFR-P3 and NFR-P4 hold.
- **Every node named.** Labels prefer the right, fall back to the left, and are dropped only when both would cover a node or a label. A dropped label is still in the list (NFR-A3).
- **Change in words.** The change word sits in the label (`+2 −0`, `+12 new`, `changed`, `changed unseen`), so a change is told by a word as well as its ring's colour (NFR-A1).
- **Memory as text.** Memory files have no edges and no position; a named line under the card says more than a row of squares. They leave the raster.
- **An eased pulse.** Three rings, each wider and fainter, then the plain frame: the eye reads a ripple, not a blink. It costs four blits and no render; the wiring keeps the last raster's size, as before, and the pulse still waits for the queue so the layout write's redraw does not wipe it.
- **Layers.** `layout` gains the flow force, the neighbour start point and the free first pass. `render` draws the card, shapes, edges, labels, meter, now and legend lines; the wiring passes the focus (selected or now) and the pulse frames. Every `$` call stays in the wiring.

## Testing decisions

- **Secondary seam:** unit tests of `layout` for determinism, stability, timing, flow and start points (F09-AC1 to AC3, AC25, AC26).
- **Primary seam:** UI tests mount the pane on `terminal` and `desktop` and decode the `Raster`'s `cells` into characters, colours and dots (F09-AC4, AC5, AC7, AC11, AC13 to AC23, AC27); a test helper turns a braille cell back into its lit dots. The encoder is in `render`, so it is tested only through the mount (D8). Event tests advance `mock.clock` for the queue (F09-AC12) and the pulse; the test's own hook beneath `ui.blit` records each blit's cells (F09-AC24). NFR-P3's benchmark mounts a 60-node, 120-edge graph.
- Tests of struck criteria (AC6, AC8, AC9) are replaced by those of AC19, AC23 and AC24.

## Mods API used

| Need | Event or method |
| --- | --- |
| Graph | `Raster` from `$.ui.resolve(e)` (terminal only): `key`, `columns` 1 to 512, `rows` 1 to 256, `cells` as packed base64 of `[codePoint, foreground, background]`; a code point is a printable width-1 BMP character, braille included |
| Header, now and legend lines | `Text` with `color` as a raw hex string (`Color`), `bold`, `dimColor` |
| Room | Pane props `bodyColumns`, `scroll.bodyRows` |
| Pulse | `$.ui.blit({ requestId: 'cc-graph', key: 'graph', cells, columns, rows })` |
| Off-path layout, pulse timing | `$.clock.after` (ARCH-Q1) |

## Data model changes

The `layout` key (`Point` per node id) is unchanged. 02's state table: the terminal graph draws each state as a braille shape (R15), not its list glyph in one cell.

## Manual check

1. In a copy of `fixtures/sample-app`, open `/graph`, press `g`, and run the reference session's turn 1.
2. Every node is named, importers sit above what they import, and nodes keep their place as new files arrive.
3. A newly touched node ripples once, then keeps a halo while it is the latest; the now line names it.
4. Check against the golden graph in [04](../../04-reference-session/spec.md): states, rings, change words and import edges read the same (the blind edge follows with F07).
5. Look at the card in a light terminal theme and in a second font (braille rendering differs by font).
6. Shrink the pane until the list takes over, and widen it again.

## Out of scope

- Pointer selection on the raster: `Raster` takes no presses. Rows and keys select (F08); a pointer overlay is F10's spike S3.
- `Image` with the kitty graphics protocol. It would draw a sharper graph in some terminals only; a later idea in the roadmap.
- Panning and zooming beyond fitting the graph to the card.
- The blind-spot warning line and the detail card under the graph: F07 and F11.
- A theme-following palette.

## Open questions

- [ ] **F09-Q1** (not blocking) Does the dark card read well in a light terminal theme, and does braille render evenly in the common fonts? Checked in the manual check; a change would only touch R22's colours.

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Checked against the 2.1.296 types. Positions moved to the `layout` key and the pass off the return path; added the minimum height, the legend rule, pulse by blit without a render pass, and a canvas unit for layout limits.
- 2026-10-13 Ticketing, checked again against the 2.1.296 types and the v0.1 code. A node is one cell with its list glyph, a change its background (R5); clusters seed by the parent folder, not the top-level one, which put the whole sample app in one cluster (R3); memory files take a fixed row (R5); the header and footer notes count against the raster's rows (R1); a pass also drops removed nodes (R4, AC12); labels replace characters a `Raster` refuses (R6, AC11); the pulse waits for the queue and clears with a second blit (R7, AC9); decisions and blind edges wait for F12 and F07 (R5); the list names imports so NFR-A3 holds (R10, AC10); AC4 is tested through the mount, not a unit test of `render` (D8). Approved by the owner.
- 2026-10-13 Ticket 01: the renderer choice also asks for `e.surface === 'terminal'`, since the test kit's table holds `Raster` on every surface (F08-R10, D4).
- 2026-10-13 Ticket 03: R1 allows `▄` for a cell with only its bottom pixel lit; `▀` would paint the unlit top half in the terminal's foreground colour. Approved by the owner.
- 2026-10-13 Ticket 05: R6 and AC6 drop a label that would cover any node or memory cell, not only a drawn label. Two labels on a row can only overlap when the left one covers the right node's cell, which erased the glyph and broke NFR-A3 and AC4. Approved by the owner.
- 2026-10-13 Back to Review: redesign after the owner's review of the first build, from a mock and a prototype the owner approved. One-cell glyphs joined by half-block staircases at hash-seeded positions read as noise. Braille dots on a card (R11, R12, R22), state shapes sized by tokens with change rings (R15), dotted edges and one focus (R16), a label on every node with its change word (R17), a now line (R18), an eased pulse (R19), a legend in words with memory named (R20), a meter bar (R21). The layout gains a flow force, neighbour start points and a free first pass for new nodes (R13), and the renderer fits the graph to the card (R14). R1, R3, R5 to R8 and AC6, AC8, AC9 struck; AC13 to AC27 added. Checked against the 2.1.296 types: `Raster` admits braille, `Color` admits hex. Approved by the owner.
