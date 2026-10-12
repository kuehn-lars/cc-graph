# 04: Agent names kept from first sight

**What to build:** The mod knows every agent that touched a file by its type and task ("Explore: Find uses of verify"), even after Claude Code forgets the agent. The card and legend that show the names come later (F11, F09, F10). This ticket stores them.

The first time the `tool.call` hook sees an agent id, it calls `$.agent.list()` once and writes the agent's `{ id, type, description }` under its id in the `agents` key. An id the list does not name is stored as type "agent", with the first 8 characters of the id as its description. An agent often reads several files in parallel, so the id is marked as seen before the hook awaits the list. A module-level set does this, like `cwd`; a reload refills it from the `agents` key or simply asks again.

The name is written by its own `update` of `agents`, outside the call that writes `graph` (I9 is about `graph`). `/clear`, `/resume` and `/branch` empty `agents` with the other keys (F03-R7).

Tests answer `agent.list` from a hook beneath and count the calls. The rows come from ticket 01's recording. The unknown id (F15-AC6) is DERIVED.

Requirements: F15-R4.

**Blocked by:** 01 Record a session with an Explore agent and a worktree agent, 02 Subagent work stays out of the meter

**Touches:** the wiring only (the `tool.call` hook, the reset). No model files, so it runs in parallel with 03.

**Status:** done

- [x] F15-AC4 two reads by `ag1`: `agent.list` called once, `agents.ag1` = `{ id: 'ag1', type: 'Explore', description: 'Find uses of verify' }`
- [x] F15-AC6 `7f3a9c21e0`, not in the list: type "agent", description `7f3a9c21` (DERIVED)
- [x] Two calls by a new agent raised together still call `agent.list` once
- [x] A main-loop call never calls `agent.list`
- [x] `source: 'clear'` empties `agents`
- [x] The check command passes, including `check-calls.mjs` (`$.agent.list` is on the NFR-S1 allowlist)
