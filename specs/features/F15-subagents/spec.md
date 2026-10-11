# F15 Subagent attribution

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Review | v0.1 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | F01, F02, F03, F08 |

## Problem

When Claude hands a search to a subagent, the files that subagent reads are in its own context, not the main conversation's. Counting them as Claude's knowledge would make the meter lie in the very first release, and hide that the main conversation only has the subagent's summary.

## Solution

Files only subagents touched are marked "subagent only", tagged with the agent's type and task, drawn with a distinct outline, and left out of the meter. When the main conversation later reads one itself, it joins the meter and keeps its tag. Changes a subagent makes are marked like any other, since they change the files Claude works on.

## User stories

1. As a developer, I want files a subagent read marked as the subagent's, so that I don't assume the main conversation knows them.
2. As a developer, I want the meter to count only what the main conversation holds, so that delegating work never inflates it.
3. As a developer, I want to see which agent touched a file, by its type and task, so that I can tell an Explore search from a review.
4. As a reviewer, I want changes a subagent made marked like Claude's own, so that no edit escapes review.
5. As a developer, I want agent names kept after the agent finishes, so that the card still says who touched the file.

## Requirements

- **F15-R1** When a tool call carries `e.agentId`, the mod applies F01's and F02's rules to the file and adds the agent's id to the node's `agents`. Only a call without `agentId` sets `mainLoop: true`. A node with `mainLoop: false` is "subagent only".
- **F15-R2** The mod draws a subagent-only node with a second, dotted outline, and the list adds the word "agent" to its row. It never counts toward the meter (I1).
- **F15-R3** A main-loop compaction (F03-R1) leaves subagent-only nodes as they are, since they were never in the main conversation's context.
- **F15-R4** When a node is first touched by an agent id the mod has not seen, the mod calls `$.agent.list()` once and stores that agent's `type` and `description` under its id in `agents`. An id the list does not name (a workflow's agent, an engine fork) is stored as type "agent" with the first 8 characters of the id.
- **F15-R5** Changes a subagent makes (`Edit`, `Write`, `NotebookEdit`) set `change` as the main loop's do.
- **F15-R6** When the main loop later touches a subagent-only node, the mod sets `mainLoop: true`, so it joins the meter, and keeps its `agents`.
- **F15-R7** The card (F11) and the legend name each agent as "‹type›: ‹description›".

## Acceptance criteria

- **F15-AC1** Given a subagent reads `a.ts`, then `a.ts` is subagent only and the meter is unchanged.
- **F15-AC2** Given the main loop then reads `a.ts`, then it counts toward the meter and keeps the agent's id in `agents`.
- **F15-AC3** Given a subagent edits `b.ts`, then `b.ts` has `change: edited` and the agent's id in `agents`.
- **F15-AC4** Given two reads by agent `ag1`, whose `$.agent.list()` entry is `{ type: 'Explore', description: 'Find uses of verify' }`, then `$.agent.list()` is called once and `agents.ag1` holds that type and description.
- **F15-AC5** Given `a.ts` is subagent only and `read`, when the main conversation compacts, then `a.ts` stays `read`.
- **F15-AC6** Given agent `7f3a9c21e0` is not in `$.agent.list()`, then `agents` holds it as type "agent" with description `7f3a9c21`.

## Implementation decisions

- **Shipped in v0.1.** Without it, the first release's meter would count every file an Explore agent skimmed. The rule is small; the honesty it buys is the product.
- **Cache names on first sight.** `$.agent.list()` drops an agent some time after it ends, so the name is stored when the agent is first seen, and the list is asked once per agent, not per call.
- **No per-agent view yet.** The pane's `view.agentId` says which agent's transcript the person has open; filtering the graph by it is a later idea in the roadmap.

## Testing decisions

- **Seam:** event tests raise `$.tool.call` with `agentId` set (the test's hooks beneath answer the tool and `agent.list`, counting calls), then read `graph` and `agents`. F15-AC5 raises a main-loop `$.session.compact`.

## Mods API used

| Need | Event or method |
| --- | --- |
| Which loop | `e.agentId` on `tool.call` (absent on the main loop) |
| Agent names | `$.agent.list()` → `{ id, type, description, … }[]` |

## Data model changes

Adds `FileNode.agents`, `FileNode.mainLoop`, `Agent`, and the `agents` key.

## Manual check

1. In a copy of `fixtures/sample-app`, ask Claude to have an Explore agent find every use of `verify`.
2. The files the agent read show the dotted second outline and "agent", and the meter does not grow.
3. Ask Claude to read one of them itself. It joins the meter and keeps the agent tag.

## Out of scope

- A graph filtered to one agent (the pane's `view.agentId`). A later idea in the roadmap.
- Subagents' thinking (F05-R7) and subagents' own compactions (I7).

## Open questions

None.

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Moved to v0.1 so the first meter is honest; names cached on first sight; main-loop compaction leaves subagent-only nodes alone; unknown agent ids named.
