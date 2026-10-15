# 06: Agent worktrees

**What to build:** An agent's worktree never shows as a node. A subagent's writing `Bash` call runs `git status` (with `HEAD`) in `.claude/worktrees/agent-<agentId>`, or in the working tree when `git` cannot run there, each worktree with its own baseline starting clean. What it finds lands on the working tree's node with "… in worktree agent-<agentId>". The `process.run` stand-in answers `status` by `cwd`.

Requirements: F07-R15, R16.

**Blocked by:** 04

**Touches:** `parse` (status: skip `.claude/worktrees/`), the wiring (a baseline per tree).

**Status:** ready-for-agent

- [ ] F07-AC20, AC21
- [ ] The check command passes
