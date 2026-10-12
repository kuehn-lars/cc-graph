# 04: Say when the graph is over the cap

**What to build:** When nothing more can be evicted because the changed files alone exceed the cap, the graph keeps them all and the list view's footer says by how much, e.g. "3 files over the cap of 20". The note goes away once the graph is back under the cap. This is the first footer note anyone writes, so it also draws the footer section F08-R5 lists last: the newest five notes, one line each.

**Blocked by:** 02 (the many-changes recording), 03 (eviction)

**Status:** ready-for-agent

- [ ] F14-AC8: test named `F14-AC8 …` replays the many-changes session with `{ options: { maxNodes: 20 } }`, failing first, then keeping every changed file and showing the note
- [ ] The footer draws only when there is a note
- [ ] The check command passes
