# 02: Record a wide session

**What to build:** Real recordings that go past a cap of 20, so F14-AC1 and F14-AC8 can fail before the code exists. The reference session touches 13 files and never reaches the cap.

Record with a probe mod in the style of `fixtures/sessions/memory-probe`, in a throwaway folder that is git-initialised and committed, with a throwaway config directory (the repo is public: no home path, no personal memory file). Add a script beside the other `record-*-session.mjs` scripts and a README section with the command and every way the run differed.

- **Wide session (AC1):** a generated project of 30 or more small files. Over two or more turns Claude reads at least 25 of them, searches once, and edits two or three. Reads should spread across turns so `lastTurn` differs.
- **Many changes (AC8):** Claude creates or edits 22 or more files in one session, so more than 20 changed files exist.

If a recording shows something F14 or I5 did not expect, stop and propose the spec change before going on.

**Blocked by:** None (can start immediately; no hook code, runs in parallel with 01)

**Status:** ready-for-agent

- [ ] Both sessions recorded from real runs, nothing edited by hand
- [ ] README section: how to record again, how each run differed
- [ ] No personal text or path in the fixtures
- [ ] The check command passes
