# 04: Hidden thinking names the setting

**What to build:** Without `showThinkingSummaries`, Claude Code streams thinking with empty text (spike S2). When a main-loop step's thinking chunks are all empty and no note is held, the footer says "Thinking is hidden: turn on showThinkingSummaries to see it.", once. The first note stored removes it. A step with no thinking chunks at all says nothing. Chunks come from `fixtures/sessions/thinking.ts` (`hidden`).

Requirements: F05-R6, R9.

**Blocked by:** 03

**Touches:** `model` (the footer note), the wiring (the `notes` key).

**Status:** ready-for-agent

- [ ] F05-AC7, AC9
- [ ] The check command passes
