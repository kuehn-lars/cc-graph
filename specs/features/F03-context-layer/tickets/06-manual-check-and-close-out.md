# 06: Manual check and close-out

**What to build:** F03 reaches Done (CLAUDE.md, Done). Walk the spec's manual check with the owner in a copy of the sample app:

1. Claude reads three files, then `/compact`.
2. `/graph` shows the three as `○`, except any Claude Code re-attached, and the meter shows the new fill after the next turn.
3. Reading one again turns it `●`.
4. `/clear` leaves "Nothing read yet."

**Blocked by:** 01, 02, 03, 04, 05

**Status:** blocked

- [ ] Manual check walked with the owner, in a terminal and in the desktop app
- [ ] Spec status set to Implemented
- [ ] `node scripts/trace.mjs --check` passes
- [ ] CHANGELOG has an F03 entry
- [ ] Spec status set to Verified once CI is green
- [ ] This `tickets/` folder is deleted (`spike-s1.md` stays)
