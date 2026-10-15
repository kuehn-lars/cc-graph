# 03: Deleted after Claude's own write

**What to build:** A file Claude wrote or edited and a later command removes shows as `deleted`. After each `Write`, `Edit` or `NotebookEdit` the mod queues a refresh of the baseline, at most one waiting.

Also adds the tests for F07-AC3 and AC10. v0.2 already does what they say (change precedence, the `turn.start` refresh), so they pass on arrival; say so in the commit.

Requirements: F07-R13 (and R5, R6 as shipped).

**Blocked by:** None (can start immediately)

**Touches:** The wiring (the baseline queue).

**Status:** ready-for-agent

- [ ] F07-AC16
- [ ] F07-AC3, AC10 (pass on arrival)
- [ ] NFR-P6: one refresh per burst of edits, counted
- [ ] The check command passes
