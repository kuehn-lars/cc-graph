# 05: Reference session through RS-4

**What to build:** The reference session drives the graph to RS-4 by itself. After the compaction and the five re-attachments:

- `routes/index.ts` (read with a range) and `password.ts` (search only) are `compacted`;
- every change mark is kept;
- `login.ts`, `rateLimit.ts`, `config.ts`, `redis.ts` and `sessions.ts` are `read` again;
- one `CompactMark` records 22,694 and 4,959 with `kept: 0`.

The replay helper sends only process 1 today. It is extended to go on through process 2 (`session.compact`, answered beneath with its recorded result) and process 3 up to its last `prompt.attachment` before step 10. Each `session.start` row is sent again. This shouldn't trip the `/graph` command registration; if it does, find out why before working around it. The summarizer's attachments (process 2, with `agentId`) and the `nested_memory` and `instructions` rows pass through and must change nothing. The recording has no `classic.SessionStart` rows, so ticket 04's reset never fires during the replay.

Checkpoint: RS-4 (04 Reference session).

**Blocked by:** 01 A main-loop compaction hollows what it did not keep, 02 Re-attached files come back filled

**Status:** ready-for-agent

- [x] RS-4 asserted in its own scenario test, replaying the recorded processes 1 to 3 up to the re-attachments
- [x] RS-1 still passes on the extended helper
- [x] The check command passes
