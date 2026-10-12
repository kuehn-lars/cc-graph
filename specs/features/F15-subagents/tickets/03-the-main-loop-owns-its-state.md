# 03: The main loop owns a node's state

**What to build:** The meter counts only what the main conversation holds, even when a subagent and the main loop touch the same file.

- The main loop reads a file an agent read before: the file joins the meter, sized by the main loop's read, and keeps the agent's tag.
- An agent reads a file the main loop already has, or had and lost to compaction: nothing changes but the tag.

These rules go into the shared node helper (F15-R8), so every reducer follows them:

- **Agent touch of a `mainLoop` node:** add the id to `agents` and stamp `touched` and `lastTurn`. `state`, `tokens`, `seen`, `readId`, `hits` stay. An agent's edit still applies its change (R5).
- **Main-loop touch of a subagent-only node:** the reducer sees no old node for its state rule, then keeps `change`, `reason`, `added`, `removed`, `line`, `agents` and `firstTurn` from the old one, and sets `mainLoop: true`.

Requirements: F15-R6, F15-R8.

**Blocked by:** 02 Subagent work stays out of the meter

**Touches:** the node helper and the reducers in the model. Ticket 05 also adds to the reducers (the worktree `reason`), so when both run in parallel worktrees, merge this one first and rebase 05.

**Status:** done

- [x] F15-AC2 a subagent-only `a.ts`, then a main-loop read: in the meter, the agent's id still in `agents`
- [x] F15-AC7 a main-loop `a.ts` compacted, then a subagent's read: still `compacted` with its `readId`, the id added, the meter unchanged
- [x] F15-AC8 a subagent's whole read, then a main-loop read of lines 1 to 40: `partial` with the main loop's tokens, `seen` and `readId`
- [x] A subagent's search of a main-loop `read` node leaves its `hits`; a main-loop search of a subagent-only `read` node makes it `search`
- [x] A subagent-only edited node, then a main-loop read: `read`, still `edited` with its line counts
- [x] The check command passes
