# 05: Manual check and close-out

**What to build:** F05 reaches Done (CLAUDE.md, Done). The README says thinking shows only with `showThinkingSummaries` on, for every model (the v0.4 exit gate: "the README says which models show thinking"), and its privacy section covers excerpts (NFR-S2). Walk the spec's manual check with the owner in a copy of the sample app.

Requirements: All of F05; NFR-P2, S2.

**Blocked by:** 01, 02, 03, 04

**Touches:** README, the spec, CHANGELOG.

**Status:** ready-for-agent

- [ ] README names `showThinkingSummaries`
- [ ] Manual check walked with the owner in a terminal
- [ ] Spec status set to Implemented
- [ ] `node scripts/trace.mjs --check` passes
- [ ] CHANGELOG has an F05 entry
- [ ] Spec status set to Verified once CI is green
- [ ] This `tickets/` folder is deleted
