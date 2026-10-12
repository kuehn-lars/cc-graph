# 05: Reference session through RS-1, and the F08 seeds become replays

**What to build:** The reference session drives the graph to RS-1 by itself: after step 3, `routes/index.ts` is `partial`, `login.ts` is `read` with 2 hits, and `password.ts` is `search` with "2 search hits, never opened". F02 was the last missing piece of that checkpoint.

The F08 tests that seed a `search` node because no feature produced one yet (F08-AC2 after step 6, F08-AC8 at RS-1, both marked DERIVED) switch to replaying the recorded steps from `fixtures/sessions/reference.ts`, as F08's spec asks once F02 ships. Their DERIVED notes go.

Checkpoint: RS-1 (04 Reference session).

**Blocked by:** 01 A plain `rg -n` becomes search nodes

**Status:** ready-for-agent

- [ ] RS-1 replaying steps 1 to 3 gives the three nodes the checkpoint names, and `password.ts` has step 3's `tool_use_id` as `readId` (note: the recording has `totalLines` 121, as 04 Reference session says)
- [ ] F08-AC2 replays steps 1 to 6 instead of seeding, on every surface
- [ ] F08-AC8 replays steps 1 to 3 instead of seeding
- [ ] The check command passes
