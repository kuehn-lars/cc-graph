# 01: Record a usage breakdown

**What to build:** A real `$.session.usage({ breakdown: 'summary' })` result that the F04 tests answer with, so the shape of `context.breakdown.memoryFiles` is never typed from memory.

Record in a copy of `fixtures/sample-app` (git init and commit it there) with a probe mod in the style of `fixtures/sessions/subagents-probe`. The probe is not the mod. It logs `session.start`, `session.measure` (input) and `classic.InstructionsLoaded` (input). At `session.start`, and at each `session.measure` whose `changed` holds `context`, it also logs the result of `$.session.usage({ breakdown: 'summary' })`. One `claude -p` run: Claude reads `src/auth/login.ts`, which loads `src/auth/CLAUDE.md` (`nested_traversal`).

Run with a throwaway config directory so that no user, local or auto-memory file of the person's own shows up. The repo is public, so a home path or a memory file's name must not get in. Write `fixtures/sessions/memory.ts` (`export default { claudeCode, events }`, like `subagents.ts`) with a script beside `scripts/record-subagents-session.mjs`, and add a README section with the command and every way the run differed.

Things the recording answers (put them in the README section, ticket 03 builds on them):

- Before the nested load, does `memoryFiles` hold only the project `CLAUDE.md`, and after it both files?
- Is `path` absolute, and is `type` the same label `memory_type` gives?
- Does `session.measure` report `context` in `changed` after the turn?

If an answer contradicts F04-R1, stop and propose the spec change before going on.

**Blocked by:** None (can start immediately)

**Touches:** `fixtures/sessions/`, `scripts/`. No hook code, so it runs in parallel with 02.

**Status:** ready-for-agent

- [ ] `fixtures/sessions/memory.ts` recorded from a real run, nothing edited
- [ ] README section: how to record again, how the run differed, the answers above
- [ ] No personal text or path in the fixture
- [ ] The check command passes
