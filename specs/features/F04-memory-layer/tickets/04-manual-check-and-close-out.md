# 04: Manual check and close-out

**What to build:** F04 reaches Done (CLAUDE.md, Done). Walk the spec's manual check with the owner in a copy of the sample app:

1. Run `/graph list`. The Memory section lists the project `CLAUDE.md`, and the user `CLAUDE.md` if there is one, with types.
2. Ask Claude to read `src/auth/login.ts`. While the turn runs, `src/auth/CLAUDE.md` appears with "nested" and "≈?"; after the turn it has a size.

F04-R5 (memory as squares `■` in their own cluster) is checked with F09 and F10, which draw the graph.

**Blocked by:** 01, 02, 03

**Status:** blocked

- [ ] Manual check walked with the owner, in a terminal and in the desktop app
- [ ] Spec status set to Implemented
- [ ] `node scripts/trace.mjs --check` passes
- [ ] CHANGELOG has an F04 entry
- [ ] Spec status set to Verified once CI is green
- [ ] This `tickets/` folder is deleted
