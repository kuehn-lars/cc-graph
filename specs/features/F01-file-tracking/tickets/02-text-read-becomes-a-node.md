# 02: Text Read becomes a node: the first full path

**What to build:** When Claude reads a text file, it appears in the `graph` as `read` or `partial`, with an honest `seen` ("120 lines", "lines 1 to 40 of 120"), an estimated `tokens` and the `readId`. Paths are stored relative to the session's working directory, or absolute outside it (I4). Denied and errored reads leave the graph alone, and the hook always hands back what it received.

This ticket builds the shape every later F01 ticket reuses: a `tool.call` hook in the wiring turns the result into one `fileRead` action, and a pure reducer applies it through a single `update` of `graph`. The turn and `seq` bookkeeping lives in that reducer.

Pieces no other v0.1 ticket provides, so this one adds them:
- **The `turn` counter.** The 02 data model owns it and 01 Architecture says it comes from main-loop `turn.start`, but no v0.1 feature writes it. Hook `turn.start` and count up.
- **The working directory for I4.** It comes from `session.start` resolving `{ cwd }`. The state contract has no key for it and `$.session.cwd` is not on the NFR-S1 list, so keep it in the wiring. `session.start` fires again after a hot reload, which refills it.
- **Fields owned by later features.** New nodes start with `change: null`, `reason: null`, `hits: 0`, `agents: []` and `mainLoop: true` until F15 decides attribution.

Requirements: F01-R1, F01-R8, F01-R9, F01-R10, F01-R11.

**Blocked by:** 01 Record the F01 tool-result fixtures

**Status:** ready-for-agent

- [ ] F01-AC1 whole read is `read`, "120 lines", tokens = ceil(length / 4)
- [ ] F01-AC2 ranged read is `partial`, "lines 1 to 40 of 120"
- [ ] F01-AC3 token-capped read is `partial`
- [ ] F01-AC7 denied read leaves the graph unchanged and returns the errored result it received
- [ ] F01-AC10 `/w/src/a.ts` becomes `src/a.ts`, `/etc/hosts` stays absolute
- [ ] `firstTurn`, `lastTurn` and `touched` are set as F01-R9 says (no AC of its own; covered in the AC1 test)
- [ ] The M0 placeholder test is deleted
- [ ] The check command passes
