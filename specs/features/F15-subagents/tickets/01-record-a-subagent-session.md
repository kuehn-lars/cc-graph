# 01: Record a session with an Explore agent and a worktree agent

**What to build:** A real recording that the F15 tests replay, so nothing about subagents is typed from memory: what `agentId` a subagent's `tool.call` carries, what `$.agent.list()` answers for it, and what paths and search output an agent in a worktree produces.

Record in a copy of `fixtures/sample-app` (git init and commit it there), with a probe mod in the style of `fixtures/sessions/reference-probe`. The probe logs `tool.call` (input with `agentId`, and the `next(e)` result), `agent.spawn` (input and result) and, after each spawn and at each subagent's first `tool.call`, the rows of `$.agent.list()`. The probe may use `$.fs`. It is not the mod. One `claude -p` run whose prompt spells out the steps:

1. An Explore agent finds every use of `verify` (`rg`, then `Read` of at least two files, one of them whole).
2. The main loop reads one of those files, lines 1 to 40.
3. An agent with `isolation: 'worktree'` reads `src/auth/login.ts`, edits it (one added comment line) and runs one `rg` inside its worktree.

Write `fixtures/sessions/subagents.ts` (`export default { claudeCode, events }`, like `reference.ts`) with a script beside `scripts/record-reference-session.mjs`. Add a section to `fixtures/sessions/README.md` with the command and every way the run differed from these steps. Check that no personal text got in.

Things the recording answers. Write them in the README section, because tickets 04 and 05 build on them:

- Does a subagent's `tool.call` carry `agentId`, and does `turn.start` stay silent for it (01 Architecture says it does)?
- What are `type` and `description` in the `agent.list` row, and is the row there when the agent's first `tool.call` arrives?
- Where does the worktree live (expected `<cwd>/.claude/worktrees/<name>/`)? What `file_path` do the worktree agent's `Read` and `Edit` carry? Where does its `rg` run, and what paths does `rg` print?

If an answer contradicts F15-R4 or F15-R9, stop and propose the spec change before going on.

**Blocked by:** None (can start immediately)

**Touches:** `fixtures/sessions/`, `scripts/`. No hook code, so it runs in parallel with 02 without conflicts.

**Status:** ready-for-agent

- [ ] `fixtures/sessions/subagents.ts` recorded from a real run, nothing edited
- [ ] README section: how to record again, how the run differed, the answers above
- [ ] No personal text in the fixture
- [ ] The check command passes
