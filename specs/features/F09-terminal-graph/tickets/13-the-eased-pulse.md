# 13: The eased pulse

**What to build:** When Claude touches a file while the graph is shown, a ripple runs out from its node: a white ring 4 dots outside its outermost ring, 120 ms later a wider ring in the halo colour, 240 ms later a faint dotted ring wider still, and at 400 ms the plain frame. Four blits, no render pass. As before, the pulse waits for the queue, a render in between ends it, and a denied blit is ignored; the wiring keeps the last raster's size.

Requirements: F09-R19.

**Blocked by:** 08, 11

**Touches:** the wiring (pulse timing), `render` (a frame with a ring at a given distance).

**Status:** done

- [x] F09-AC24 a `Read` while the graph is mounted: four blits for key `graph` at 0, 120, 240 and 400 ms, the first with `#f0f3f6` dots 4 dots outside the node, the last with none outside its halo, no render pass added (replaces the AC9 test)
- [x] With `view: list` a `Read` blits nothing and nothing throws
- [x] A blit answered `{ deny }` changes nothing; the hook still returns `next(e)`'s result
- [x] The check command passes
