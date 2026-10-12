# 06: Text summary where nothing draws

**What to build:** In `claude -p` and the Agent SDK nothing draws, so `/graph` opens no pane and answers in text instead: the count of files per state, in the order `read`, `partial`, `search`, `compacted`, `unread`, `ghost`, then per change, `edited`, `created`, `external`, `blind`, with zero counts left out. The meter line joins it with F03 (F03-AC13) and the blind spots with F07; neither is drawn here.

F08-AC8 asks for the graph at RS-1, which holds a `search` node. As in 02, the test seeds that graph until F02 ships, and says it is derived.

Requirements: F08-R4, NFR-C3.

**Blocked by:** 01 `/graph` opens the pane, 02 File rows, newest first (the state order and the badge words)

**Status:** ready-for-agent

- [ ] F08-AC8 with no surface and the graph at RS-1, `/graph` opens no pane and answers a text holding "1 read, 1 partial, 1 search" (seeded graph, marked derived)
- [ ] NFR-C3 with no surface, every F01 hook and `/graph` run without error
- [ ] Change counts follow the state counts and zero counts are left out (F08-R4; one test)
- [ ] The check command passes
