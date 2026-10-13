# 05: Labels

**What to build:** The graph names only what helps: the selected node, changed nodes and the 5 largest by tokens get their file name to the right of their cell. A label that would overlap one already drawn, or run off the raster, is dropped, lower priority first. A label character the `Raster` would refuse (wide, or outside the Basic Multilingual Plane) is drawn as `?`, so a CJK or emoji path never blanks the graph. The existing column width helper in `render` already says which characters are wide.

Requirements: F09-R6.

**Blocked by:** 03

**Touches:** `render` (the raster renderer).

**Status:** done

- [x] F09-AC6 a changed node whose label would cover the selected node's cell: only the selected label is drawn (spec amended)
- [x] F09-AC11 the selected node `src/日本.ts`: the `Raster` is drawn and its label reads `??.ts` (derived: no recording has such a path)
- [x] A label running past the right edge is dropped
- [x] An unchanged node outside the 5 largest gets no label
- [x] The check command passes
