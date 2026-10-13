# 14: Boxes in Claude Code's colours

**What to build:** Replace the braille card with boxes: each file a rounded box on the terminal's background holding its glyph, name and change word, solid in context and dashed otherwise, with a size bar; a ghost a tag. Boxes fitted per axis and moved off each other; edges as box-drawing lines at right angles; the focus and its edges in Claude's colour; the pulse a border flash. Every colour a Claude Code theme key (`Text`) or its dark-theme value (`Raster`).

Requirements: F09-R11, R18, R21, R23 to R29.

**Blocked by:** 08 to 13

**Touches:** `render` (cells, legend, meter, now line), the wiring (title row).

**Status:** built, waiting for the owner's review of the spec and the manual check

- [x] F09-AC28 to AC37, with AC17, AC21, AC22 and AC27 as amended
- [x] Tests of struck criteria and requirements removed or replaced
- [x] The check command passes
