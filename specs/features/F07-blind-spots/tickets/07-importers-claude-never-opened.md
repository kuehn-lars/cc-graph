# 07: Importers Claude never opened

**What to build:** Soon after Claude edits or creates a file, files that import it but were never opened show as ghosts with a `blind` edge, and the footer's Blind spots section lists them newest first, at most 5, with "imports login.ts, never opened". `git grep` runs once per path per turn, off the hook's path; each hit is confirmed with F06's resolver. Reading a ghost clears its edge and its footer line.

Requirements: F07-R2, R3, R4, R10.

**Blocked by:** None (can start immediately)

**Touches:** `parse` (pattern builder, `git grep` line parser), `model` (importers, clearing `blind`), `render` (the Blind spots section), the wiring.

**Status:** ready-for-agent

- [ ] F07-AC1, AC7, AC8, AC9, AC11
- [ ] Unit tests for the pattern builder (escaped names) and the grep parser
- [ ] The check command passes
