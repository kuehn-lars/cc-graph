# 15: Folders and change colours

**What to build:** Show where each file lives and what happened to it. Each folder becomes a titled frame around its boxes; folders stack in layers with importers above, and folders without imports fill free room at the side. Inside a folder, an importer's line sits above what it imports. Edges run top down, enter where they cross the least and cross frames at `┼`. Edit counts are coloured as a diff, deleted files are red with a dimmed name, a focused tag is orange, and the legend explains the size bar and names `deleted`.

From the owner's review of ticket 14 (a debug session drawn as a scattered field of boxes, two `index.ts` and two `CLAUDE.md` indistinguishable, the bar unexplained). Deleted and shell-created files come from F07 ticket 01.

Requirements: F09-R24, R26 to R30.

**Blocked by:** 14

**Touches:** `render` (cells, legend, now line).

**Status:** built, waiting for the owner's review of the spec and the manual check

- [x] F09-AC38 to AC43, with AC29, AC33, AC34 and AC40 as amended
- [x] The side-by-side edge test removed (one end of an edge is always above the other)
- [x] The check command passes (NFR-P1 and NFR-P3 are load-sensitive on a busy machine)
