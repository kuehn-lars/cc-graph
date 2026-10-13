# 04: Change rings, the memory row and the legend

**What to build:** A changed node's cell gets its ring colour as background (amber edited, green created, grey external, red blind). Memory files sit as `■` cells in one row along the canvas's bottom-left, in path order. A legend line under the graph names every glyph and ring on screen and nothing else. The list rows name imports, so the list still carries every fact the graph shows: an importer's row ends with "imports ‹n›", a ghost's row says "imported by ‹file name›" with "+‹n›" for further importers.

Requirements: F09-R1 (legend row), R5 (rings, memory row), R8, R10; NFR-A3.

**Blocked by:** 01

**Touches:** `render` (raster renderer, legend, list rows).

**Status:** ready-for-agent

- [ ] F09-AC8 the reference session after step 8: the legend names `●`, `◐`, `◌`, `■` and the amber and green rings, and none of `○`, `!`, `⋯`, `◆` or the blind edge
- [ ] F09-AC10 after step 2: `login.ts`'s row ends with "imports 2"; `password.ts` and `sessions.ts` say "imported by login.ts"
- [ ] NFR-A3 on the reference session after step 8, every node, state, change, memory file and edge the graph draws has its list row or row word
- [ ] A legend wider than `bodyColumns` is cut and closed by "…", as the list's lines are
- [ ] The F08 row tests still pass (widths, "…" cuts)
- [ ] The check command passes
