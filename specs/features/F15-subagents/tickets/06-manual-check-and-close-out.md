# 06: Manual check and close-out

**What to build:** F15 reaches Done (CLAUDE.md, Done). Walk the spec's manual check with the owner in a copy of the sample app:

1. Claude has an Explore agent find every use of `verify`.
2. The files the agent read say "agent" in the list, and the meter does not grow.
3. Claude reads one of them itself. It joins the meter and keeps the agent tag.
4. Claude has an agent in a worktree add a comment to `src/auth/login.ts`. The row is `src/auth/login.ts`, edited, saying "worktree", and no `.claude/worktrees/…` row appears.

The dotted outline (R2) and the names on the card and legend (R7) are checked with F09, F10 and F11.

**Blocked by:** 01, 02, 03, 04, 05

**Status:** blocked

- [ ] Manual check walked with the owner, in a terminal and in the desktop app
- [ ] Spec status set to Implemented
- [ ] `node scripts/trace.mjs --check` passes
- [ ] CHANGELOG has an F15 entry
- [ ] Spec status set to Verified once CI is green
- [ ] This `tickets/` folder is deleted
