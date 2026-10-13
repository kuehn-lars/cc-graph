# 11: Focus and the now line

**What to build:** One node is the focus: the selected node, or else the file Claude touched last. It wears a dotted halo 4 dots outside its outermost ring, its edges are drawn in the lit edge colour while every other edge recedes, and its label is bold (a `Raster` cell has no bold: F09-Q2, the label stays plain). Under the card a line says what is happening: `◉ now  src/auth/login.ts  +2 −0  · imports 3`, the folder dimmed and the file name bold, or "Nothing read yet." on an empty graph. The now line takes one row from the raster.

Requirements: F09-R16 (focus), R17 (bold now label), R18, R11 (the now line's row).

**Blocked by:** 08, 10

**Touches:** `render` (focus, halo, now line), the `ui.render` hook (focus passed in, the row budget).

**Status:** done

- [x] F09-AC20 `login.test.ts` touched last: its edges are `#8a94a3`, `login.ts` → `password.ts` is `#353a42`, and dotted `#9aa4b1` dots circle it
- [x] F09-AC21 after the reference session's step 2 the now line reads `◉ now  src/auth/login.ts  · imports 2`; on an empty graph, "Nothing read yet."
- [x] With a node selected, the focus follows the selection
- [x] F09-AC4's row test counts the now line
- [x] The check command passes
