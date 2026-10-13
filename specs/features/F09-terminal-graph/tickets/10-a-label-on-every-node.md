# 10: A label on every node

**What to build:** Every file on the card is named, so no shape is a mystery. A label sits on its node's centre row, two columns right of its outermost ring; its file name is bright for files in context and dimmed otherwise, followed by the change word in its change's colour: `+2 −0` for an edit, `+12 new` for a creation, `changed`, or `changed unseen`. A label that would cover a node's dots or another label, or leave the dot area, moves to the node's left; if that fails too it is dropped (the list still has it, NFR-A3). Labels go down in priority order: selected, now, changed newest first, then by tokens. A label covers edge dots and the grid. Characters a `Raster` refuses still become `?`.

The now node (the non-ghost with the highest `touched`) is computed here for the priority order; 11 gives it its halo and bold label.

Requirements: F09-R17.

**Blocked by:** 08

**Touches:** `render` (labels).

**Status:** done

- [x] F09-AC16 `login.ts` `edited +2 −0`: amber ring 3 dots outside, label `login.ts  +2 −0` with the change in `#f0b45a`; `rateLimit.ts` `created +12`: `rateLimit.ts  +12 new` in `#63d494`
- [x] F09-AC17 5 nodes placed apart on an 84 × 24 card: all 5 file names in the decoded rows
- [x] F09-AC18 a node within 6 columns of the right edge: its label ends two columns left of its ring
- [x] F09-AC19 a changed node whose label would cover the selected node's dots, no room on its left: only the selected node's label is drawn (replaces the AC6 test)
- [x] F09-AC11 still passes
- [x] The check command passes
