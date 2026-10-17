# 01: Main-loop turns only

**What to build:** A subagent's run no longer counts as a turn. Since Claude Code 2.1.301 every subagent loop raises its own `turn.start`, with `e.agentId` (spike S2; the F15 recording on 2.1.296 had none). The mod's `turn.start` hook ignores those: `turn` stays the count of main-loop turns (02 Data model), so `firstTurn`, `lastTurn` (F01-R9) and, from ticket 03, a thinking note's `turn` are right; the turn's searched paths (F02) and shell commands (F07) are not cleared mid-turn; and the between-turns `git` check (F07-R5, R20) does not run while the main loop is still working.

Spec first (CLAUDE.md: the spec changes, then the tests, then the code): 01 Architecture's row "Main-loop turn numbers" says "a subagent's run raises none", and the `git status` baseline row names "main-loop `turn.start`". Propose the change to the owner, then add a criterion under F15 (the next free `F15-ACn`, F15 back to Review until approved) so the test can be named by it.

A throwaway engine-kit test already shows the bug: after one main turn and one `turn.start` with `agentId: 'agent_1'`, `turn` is 2.

Requirements: 02 Data model (`turn`), F01-R9, F02 (searched paths per turn), F07-R5, R20; the new F15 criterion.

**Blocked by:** None (can start immediately)

**Touches:** 01 Architecture and F15 specs, the wiring (the `turn.start` hook).

**Status:** ready-for-agent

- [ ] Spec change proposed and approved by the owner
- [ ] The new F15 criterion has a test, using the `turn.start` rows of `fixtures/sessions/thinking.ts` (one carries `agentId`)
- [ ] A subagent's `turn.start` leaves `turn`, the searched paths and the shell commands as they were, and runs no `git`
- [ ] The check command passes
