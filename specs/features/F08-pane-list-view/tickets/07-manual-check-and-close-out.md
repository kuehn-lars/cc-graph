# 07: Manual check and close-out

**What to build:** F08 reaches Done (CLAUDE.md, Done). Walk the spec's manual check with the owner in a copy of the sample app: the empty pane, rows newest first, paths cut at a narrow width, selection by Tab, Enter and `3`, a click on the desktop, and the text summary from `claude -p "/graph"`. This also unblocks F01's ticket 08, which needs `/graph list`.

**Blocked by:** 01 to 06

**Status:** blocked (needs 01 to 06)

- [ ] Manual check walked with the owner, in a terminal and in the desktop app
- [ ] Spec status set to Implemented
- [ ] `node scripts/trace.mjs --check` passes
- [ ] CHANGELOG has an F08 entry
- [ ] Spec status set to Verified once CI is green
- [ ] This `tickets/` folder is deleted
