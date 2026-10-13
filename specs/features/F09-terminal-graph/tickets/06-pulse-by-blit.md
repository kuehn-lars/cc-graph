# 06: Pulse by blit

**What to build:** When Claude touches a file while the graph is shown, a ring of highlighted cells flashes around its node for one second, without rebuilding the pane. The pulse runs as a queue job after the layout pass, so the redraw that placed a new node does not wipe it: one `$.ui.blit` with the ring, a second 1000 ms later without it. The blit carries the whole frame at the mounted size, so the wiring keeps the size of the raster it last drew. A render in between ends the pulse early; a denied blit (pane closed, list view) is ignored.

Requirements: F09-R7.

**Blocked by:** 02, 03

**Touches:** the wiring (queue job, last raster size), `render` (the frame with a ring).

**Status:** ready-for-agent

- [ ] F09-AC9 a `Read` while the graph is mounted: after the queue runs, one blit for key `graph`; 1000 ms later a second; no render pass added by either (the test's hook beneath `ui.blit` counts them)
- [ ] With `view: list`, a `Read` leaves no pulse on screen and nothing throws
- [ ] A blit answered `{ deny }` changes nothing and the hook still returns `next(e)`'s result
- [ ] The check command passes
