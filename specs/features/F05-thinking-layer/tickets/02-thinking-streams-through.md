# 02: Thinking streams through untouched, and the captureThinking switch

**What to build:** `captureThinking` joins `userConfig` (F14-R1: boolean, default true, "Keep thinking excerpts"). On, the mod hooks `turn.step` and passes every chunk on unchanged and in order, returning the stream's result unchanged: a reply streams exactly as without the mod, a subagent's step included, and a stream that fails or is closed passes its error or close through. Off, no `turn.step` hook is registered. Nothing is stored yet; the hook only looks.

Requirements: F05-R1, R5 (the hook), R7, R10; F14-R1, R2; NFR-P2.

**Blocked by:** None (can start immediately)

**Touches:** `plugin.json`, the wiring (the `turn.step` hook, registration by setting).

**Status:** ready-for-agent

- [ ] F05-AC1, AC4, AC10, F14-AC2 (the "no note stored" half holds trivially until ticket 03)
- [ ] NFR-P2: a 2,000-chunk step through the hook, under 1 ms per chunk, in `tests/bench`
- [ ] `claude plugin validate` accepts the field
- [ ] The check command passes
