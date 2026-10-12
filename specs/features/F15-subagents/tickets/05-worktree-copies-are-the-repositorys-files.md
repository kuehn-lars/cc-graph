# 05: An agent's worktree copy is the repository's file

**What to build:** When Claude runs an agent with `isolation: 'worktree'`, the agent works in a git worktree under `.claude/worktrees/‹name›/`. Its reads, searches and edits land on the repository's own rows: `src/auth/login.ts`, not `.claude/worktrees/agent-a1/src/auth/login.ts`. A change made there is marked like any other, says "worktree" in the list, and carries `reason` "in worktree ‹name›". The person can then tell that the main working tree has no such change until the branch is merged.

- **Path normalization (I4):** a path inside the working directory that starts `.claude/worktrees/‹name›/` drops that prefix. The rule is lexical, with no file system (D6). The worktree's name goes along with the action, so a change can carry it.
- **Searches:** whether an agent's `rg` output lands on the right node depends on where its shell runs. Ticket 01's recording says that. Make the agent's search and read of one file land on one node, and test that with the recorded rows.
- **Changes:** an `Edit`, `Write` or `NotebookEdit` in a worktree sets `reason` "in worktree ‹name›". A later main-loop change sets `reason` to `null`. The list row adds "worktree" while the reason says so.

Mark the ceiling with a `ponytail:` comment: a worktree that a `WorktreeCreate` hook puts elsewhere stays an absolute path.

Requirements: F15-R9, I4 (02 Data model).

**Blocked by:** 01 Record a session with an Explore agent and a worktree agent, 02 Subagent work stays out of the meter

**Touches:** path normalization, the change reducers, the list row. It overlaps with 03 in the reducers: run it after 03, or rebase onto it.

**Status:** ready-for-agent

- [ ] Parser cases: `/w/.claude/worktrees/agent-a1/src/a.ts` with cwd `/w` gives `src/a.ts` and worktree `agent-a1`; `/w/.claude/worktrees/` alone, and `.claude/worktrees` outside the cwd, stay as I4 had them
- [ ] F15-AC9 a subagent's read of `/w/.claude/worktrees/agent-a1/src/a.ts` is node `src/a.ts`
- [ ] F15-AC10 a subagent's edit there: `src/b.ts` edited, `reason` "in worktree agent-a1", the row says "worktree"
- [ ] The recorded worktree agent's `Read`, `rg` and `Edit` of `src/auth/login.ts` make one node, and no `.claude/worktrees/…` node
- [ ] A later main-loop edit sets `reason` to `null`
- [ ] The check command passes
