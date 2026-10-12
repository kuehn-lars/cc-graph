# 03: Evict by I5

**What to build:** With the cap at 20, the graph never holds more than 20 file nodes. When a write to `graph` would exceed the cap, the same write evicts nodes, oldest `lastTurn` first, in the order ghost, search, compacted, partial, read. A node with a change is never evicted. The "edge to or from a changed node" protection waits for F06, since no edges exist yet; leave the rule shaped so F06 only adds edges.

Eviction runs inside the one `update` of `graph` the event already makes (I9), so a lowered cap applies at the next write (F14-R6). The work stays bounded by the node count, which the cap holds small.

**Blocked by:** 01 (the cap reaches the model), 02 (the wide recording)

**Status:** done

- [x] F14-AC1: test named `F14-AC1 …` replays the wide session with `{ options: { maxNodes: 20 } }`, failing first, then holding at most 20 files with every changed file kept
- [x] At the default 60 the reference-session tests stay green unchanged
- [x] The check command passes
