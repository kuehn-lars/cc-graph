# 08: Manual check and close-out

**What to build:** F01 reaches Done (CLAUDE.md, Done). Walk the spec's manual check with the owner in a copy of the sample app: four rows with the right glyphs, the `edited` and `created` badges, and "≈tokens · seen" for each. The check needs `/graph list`, so it waits on F08.

**Blocked by:** 07 Pass-through across the reference session, F08 Pane list view (for `/graph list`)

**Status:** blocked (needs F08)

- [ ] Manual check walked with the owner, in a terminal and in the desktop app
- [ ] Spec status set to Implemented
- [ ] `node scripts/trace.mjs --check` passes
- [ ] CHANGELOG has an F01 entry
- [ ] Spec status set to Verified once CI is green
- [ ] This `tickets/` folder is deleted
