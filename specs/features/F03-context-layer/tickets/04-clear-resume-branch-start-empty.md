# 04: `/clear`, `/resume` and `/branch` start the pane empty

**What to build:** After `/clear`, `/resume` or `/branch`, the pane describes the new conversation: "Nothing read yet.", no selection, turns counted from 0. The person's choice of view stays. The `compact` source fires during every compaction and must not reset, and `startup` doesn't either.

This ticket adds a `classic.SessionStart` hook in the wiring. It awaits `next(e)`. When `source` is `clear`, `resume` or `fork`, it writes every plugin key except `view` back to its empty value (02 Data model, Reset): `graph` to the empty graph, `turn` to 0, `selected` to `null`. Each key gets one `update`. Keep the keys and their empty values in one place, so each later feature adds its key there.

Tests raise `$.classic.SessionStart({ source })`. The test's own `on('classic.SessionStart')` is the bottom, since no settings hook runs beneath.

Requirements: F03-R7.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] F03-AC8 a graph with nodes and `view: 'graph'`, then `source: 'clear'`: the graph is empty and `view` is still `'graph'`
- [x] `resume` and `fork` reset the same way; `turn` and `selected` are emptied too
- [x] F03-AC10 `source: 'compact'` changes nothing, nor does `startup`
- [x] If ticket 03 has landed: `fill` is reset to `null`
- [x] Every case returns what the handler beneath returned
- [x] The check command passes
