# 03: Edges and positions on screen

**What to build:** The terminal graph draws each node at its stored position, scaled from the 100 × 64 canvas to the raster's columns and twice its rows, and draws each import edge as a line of half-block pixels (`▀`, foreground the top pixel, background the bottom; `▄` where only the bottom pixel is lit) from cell to cell. In a real session the reference turn's files spread out by folder, linked by their imports, and stay put as new files arrive.

Requirements: F09-R1 (half blocks), R5 (import edges), R9 (positions from `layout`).

**Blocked by:** 01, 02

**Touches:** `render` (the raster renderer).

**Status:** ready-for-agent

- [ ] Given `layout` places two nodes apart and an edge joins them, the decoded cells between them hold half blocks and both glyphs stay drawn on top
- [ ] A node with a position is drawn there; one without is drawn at its folder's seed point
- [ ] NFR-P3 a render of 60 nodes and 120 edges builds its tree in under 16 ms on each surface (benchmark through `$.ui.mount`)
- [ ] The check command passes
