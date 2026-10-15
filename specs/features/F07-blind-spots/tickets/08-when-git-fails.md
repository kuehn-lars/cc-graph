# 08: When git fails

**What to build:** A `git` job that times out or fails is dropped, written to the debug log, and the footer says "Blind-spot search timed out" once per conversation. Without `git`, nothing reaches the transcript and the footer says "Shell changes need git".

Requirements: F07-R9 (R1 as shipped).

**Blocked by:** 07

**Touches:** The wiring (the queue's failure path), `model` (notes).

**Status:** ready-for-agent

- [x] F07-AC4, AC5
- [x] The check command passes
