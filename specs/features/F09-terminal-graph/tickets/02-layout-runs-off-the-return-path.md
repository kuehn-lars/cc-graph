# 02: Layout runs off the return path

**What to build:** When a write adds or removes nodes or edges, a layout pass runs after the hook has returned and stores every node's position in the `layout` key. Files of one folder cluster around its seed point, a new node starts at its folder's seed point offset by a hash of its path, and no existing node moves more than 2 units in a pass. Positions of evicted nodes are dropped, and `/clear` resets `layout` with the other keys.

This ticket builds the off-path queue of D5 with its first job: one coalesced `$.clock.after` callback, one pending layout pass at most, a failing job dropped. F07 adds its `git` jobs to the same queue later, so keep it a queue, not a layout timer. The pass is pure (`layout(previous positions, graph) → positions`) and writes only `layout` through `update`.

Requirements: F09-R3, R4; architecture D5 (the queue).

**Blocked by:** None (can start immediately). It shares ticket 01's seed point: whichever lands second reuses the other's.

**Touches:** `layout` (new, pure), the wiring (queue, reset).

**Status:** ready-for-agent

- [ ] F09-AC1 the same nodes, edges and earlier positions give the same positions on two runs (unit)
- [ ] F09-AC2 adding one node to a 30-node graph moves no existing node more than 2 units (unit)
- [ ] F09-AC3 a pass over 60 nodes and 120 edges finishes in under 50 ms (unit)
- [ ] F09-AC12 an evicted node has no position after the next pass
- [ ] NFR-P4 a `Read` returns before `layout` is written; advancing `mock.clock` writes it
- [ ] Two `Read`s before the clock advances give one pass
- [ ] `/clear` empties `layout` (F03-R7)
- [ ] The check command passes
