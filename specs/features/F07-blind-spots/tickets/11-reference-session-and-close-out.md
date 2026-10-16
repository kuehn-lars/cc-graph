# 11: Reference session, manual check, close-out

**What to build:** F07 reaches Done (CLAUDE.md, Done). RS-2 and RS-3 pass in the scenario test. Walk manual check steps 1 to 11 with the owner in a copy of the sample app, including step 11 (spike S4's probe in an interactive session; note the result in the spike).

Requirements: All of F07; RS-2, RS-3; NFR-P6, S4, S5, R3.

**Blocked by:** 01 to 10

**Touches:** Tests (scenario), the spec, CHANGELOG.

**Status:** ready-for-agent

- [x] RS-2, RS-3
- [x] Manual check walked with the owner in a terminal (2026-10-16, all steps pass)
- [ ] Manual check in the desktop app
- [x] Spec status set to Implemented
- [x] `node scripts/trace.mjs --check` passes
- [x] CHANGELOG has an F07 entry
- [ ] Spec status set to Verified once CI is green
- [ ] This `tickets/` folder is deleted
