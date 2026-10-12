# 02: Subagent work stays out of the meter

**What to build:** When Claude hands work to a subagent, the files it reads and searches show up in the list marked "agent", and the meter does not grow. Files the subagent changes are marked edited or created like Claude's own. A main-loop compaction leaves the subagent-only nodes as they are.

The `tool.call` hook passes `e.agentId` to the parsers, so every file action says which loop it came from. The node helper both reducers share applies it to every node a call touches:

- the agent's id joins `agents` (once);
- a node created by an agent's call starts with `mainLoop: false`;
- a call without `agentId` sets `mainLoop: true`.

F01's and F02's rules run unchanged in this ticket. Ticket 03 adds who owns the state.

The meter and compaction already filter on `mainLoop` (`inContext`), so F15-AC1 and AC5 only need tests for the meter and compaction. The list row gains the word "agent" when `mainLoop` is false.

Tests raise `$.tool.call` with `agentId` set. The tool results are the recorded `fixtures/tool-results`; `agentId` is event input, not tool output. Once ticket 01 has landed, prefer its recorded rows.

Requirements: F15-R1, F15-R2 (the list part), F15-R3, F15-R5.

**Blocked by:** None (can start immediately)

**Touches:** the `tool.call` hook, the action types, the node helper, the list row. Tickets 03, 04 and 05 build on the agent id this ticket passes through, so merge it first.

**Status:** ready-for-agent

- [ ] F15-AC1 a subagent's read of `a.ts`: subagent only, the meter line unchanged
- [ ] F15-AC3 a subagent's edit of `b.ts`: `change: edited`, the agent's id in `agents`
- [ ] F15-AC5 a subagent-only `read` node stays `read` through a main-loop compaction
- [ ] A subagent's search (`Bash` `rg`) makes subagent-only `search` nodes
- [ ] A second call by the same agent does not repeat its id in `agents`
- [ ] The list row of a subagent-only node says "agent"; a main-loop row does not
- [ ] Every case returns what the handler beneath returned, with one `update` of `graph` per call
- [ ] The check command passes
