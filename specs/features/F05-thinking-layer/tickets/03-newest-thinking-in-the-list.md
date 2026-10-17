# 03: The newest thinking shows in the list

**What to build:** Each main-loop step that thought leaves one note: its first 400 characters, its full length, its turn and step, and the files its tool uses named. The list view's Thinking section, between Memory and Blind spots, shows the newest 3 as `turn 4  Check the limiter.  → login.ts, rateLimit.ts`, or "No thinking captured yet."; with `captureThinking` off the section is not drawn. The newest 20 notes are kept, in `$.state` only, and `/clear`, `/resume` and `/branch` empty them.

Building a note is a pure `model` function (blocks, tool uses, working directory, turn, step → note or nothing); the section is a pure `render` function. Chunks and results come from `fixtures/sessions/thinking.ts` (`shown`).

Requirements: F05-R2, R3, R4, R5 (the section), R8, R11; I8; NFR-S2.

**Blocked by:** 01, 02

**Touches:** `model` (the note), `render` (the Thinking section), the wiring (one write of `thinking` per step, the reset).

**Status:** ready-for-agent

- [ ] F05-AC2, AC3, AC5, AC6, AC8, AC11, AC12
- [ ] F14-AC2 now proves that no note is stored with capture off
- [ ] The check command passes
