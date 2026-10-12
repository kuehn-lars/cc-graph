# 01: A main-loop compaction hollows what it did not keep

**What to build:** After `/compact` or an automatic compaction, every file Claude now knows only from the summary turns `○` in the pane. A file whose read Claude Code kept verbatim stays `●`. Change marks stay where they are, and the graph records the compaction's before and after sizes. A subagent's compaction changes nothing in the main view. So does a vetoed compaction (`{ skip }`) or a `precompute`. Reading a hollow file again fills it.

This ticket adds a `session.compact` hook in the wiring. It awaits `next(e)` and acts only when the result stands (has `messages`, no `skip`), `e.agentId` is absent and `e.trigger` is not `precompute`. It collects the `tool_use_id` of every `toolUses` entry in the result's `messages`, then applies one action through one `update` of `graph` (I9). A pure reducer then:

- moves every `read`, `partial` and `search` node with `mainLoop` to `compacted`, unless its `readId` is among the kept ids (a search node's `readId` is its latest search call, F02-R5);
- leaves every `change` and every other node alone;
- appends a `CompactMark` with the current `turn`, the trigger, `tokensBefore` and `tokensAfter` (`null` when absent), and `kept`, the number of in-context nodes that survived.

Re-reading needs no new code: F01's `fileRead` already sets `read` or `partial` whatever the old state was. AC4 pins that down.

`mainLoop` is always `true` until F15 ships. Filter on it anyway, as F03-R1 says.

Tests raise `$.session.compact({ trigger, messages })` (plus `agentId` for AC2), and a test hook beneath answers the result (Testing decisions). The recorded compactions all keep no tool use, so a result that keeps one (AC9) or holds other figures (AC7) is built from the recorded `session.compact` result's shape in `fixtures/sessions/reference.ts`. A skip (AC3) and a subagent compaction (AC2) are taken from the type. Mark each of these DERIVED.

Requirements: F03-R1, F03-R2, F03-R8.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] F03-AC1 two `read` nodes and one `edited` node all become `compacted`; the edited one keeps `change: edited`
- [ ] F03-AC2 a compaction with `agentId` changes no node (DERIVED)
- [ ] F03-AC3 a compaction answered `{ skip }` changes no node (DERIVED)
- [ ] F03-AC4 a `compacted` node read whole again is `read`
- [ ] F03-AC6 a `precompute` compaction changes no node
- [ ] F03-AC7 `tokensBefore: 496862`, `tokensAfter: 20125` give one mark with those numbers (DERIVED)
- [ ] F03-AC9 with `toolu_02` kept, `src/b.ts` stays `read`, `src/a.ts` is `compacted`, the mark has `kept: 1` (DERIVED)
- [ ] A `search` node whose latest search call is kept stays `search`; a `ghost` or `unread` node is untouched
- [ ] A compaction is one `state.set` of `graph`, and every case returns what the handler beneath returned
- [ ] The check command passes
