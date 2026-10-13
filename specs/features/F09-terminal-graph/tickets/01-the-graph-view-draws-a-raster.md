# 01: The graph view draws a raster

**What to build:** With `view: graph` in a terminal, the pane stops drawing the list and draws the graph: the header (view keys and meter line, as the list draws them), one `Raster` keyed `graph`, and the footer notes. Every file node is one cell holding its list glyph in its state's colour, placed at its folder's seed point (no layout yet, R9's fallback). On `desktop` (no `Raster` in the table) and on `vscode` and `mobile`, the list stays. A pane too short for 8 graph rows draws the list and says "Graph needs a taller pane" in the footer.

This ticket lays down the renderer choice of F08-R10 (by the element table, then `view`), the cell encoder in `render`, and the folder seed point (a hash of the folder name) that ticket 02's layout reuses. The seed function lives in `layout`, so both tickets share one definition; it is pure.

The glyphs `●◐◌○⋯■◆` must be ones the `Raster` accepts as width-1 BMP characters: the first UI test proves it, since the kit refuses the tree otherwise.

Requirements: F09-R1 (no legend line yet), R2, R3 (seed point only), R5 (glyph and state colour only), R9.

**Blocked by:** None (can start immediately)

**Touches:** `render` (new raster renderer and cell encoder), `layout` (seed point), the `ui.render` hook.

**Status:** ready-for-agent

- [ ] F09-AC4 the mounted `Raster`'s `cells` decodes to exactly `columns × rows` cells
- [ ] F09-AC5 on `desktop` with `view: graph`, no `Raster` is drawn and the list is
- [ ] F09-AC7 `bodyRows` leaving 6 graph rows: the list is drawn and the footer says "Graph needs a taller pane"
- [ ] The `Raster` is `bodyColumns` wide and `bodyRows` less header and footer rows tall, capped at 512 by 256
- [ ] After the reference session's step 3, the decoded cells hold `◐`, `●` and `◌`
- [ ] The F08 list tests still pass with `view: list`
- [ ] The check command passes
