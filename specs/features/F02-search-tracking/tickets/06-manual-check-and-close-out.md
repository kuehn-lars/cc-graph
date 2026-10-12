# 06: Manual check and close-out

**What to build:** F02 reaches Done (CLAUDE.md, Done). Walk the spec's manual check with the owner in a copy of the sample app: a search without opening files shows `◌` rows with "N search hits, never opened", and reading one of them turns its row `●`.

**Blocked by:** 01, 02, 03, 04, 05

**Status:** blocked

- [ ] Manual check walked with the owner, in a terminal and in the desktop app
- [ ] Spec status set to Implemented
- [ ] `node scripts/trace.mjs --check` passes
- [ ] CHANGELOG has an F02 entry
- [ ] Spec status set to Verified once CI is green
- [ ] This `tickets/` folder is deleted (`research-repeated-search.md` stays: 02 Data model links it)
