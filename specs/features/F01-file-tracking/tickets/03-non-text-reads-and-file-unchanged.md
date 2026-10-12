# 03: Non-text reads and file_unchanged

**What to build:** Images, PDFs, PDF page ranges and notebooks Claude reads show as `read` with `tokens: null` and a `seen` that names the kind ("image", "PDF pages 3 to 7", "notebook, 12 cells"), so the pane admits what it cannot estimate. A `file_unchanged` answer changes nothing about a node that exists, so a compacted file stays compacted. A path with no node becomes `read`, "unchanged since an earlier read".

Requirements: F01-R2, F01-R3.

F01-AC12 needs a `compacted` node, and only F03 produces that state. The test seeds the graph instead: a `state.get` hook from the test sits beneath the mod, so it can answer the first read of `graph` with a seeded value at version 0 and pass on every later read. Confirm this with `/plugin-authoring` before relying on it.

**Blocked by:** 02 Text Read becomes a node

**Status:** partly done (F01-R2 / AC11 only; F01-R3 / AC12 wait for a recorded `file_unchanged`)

- [x] F01-AC11 image read is `read`, `tokens: null`, "image"
- [ ] F01-AC12 a `compacted` node answered `file_unchanged` stays `compacted` (deferred: no real `file_unchanged` result could be recorded in Claude Code 2.1.296, see `fixtures/tool-results/README.md`, and fixtures are never hand-typed; F01-R3 is deferred with it)
- [x] `pdf`, `parts` and `notebook` results give the `seen` wording of F01-R2 (no AC of their own; one test each is enough)
- [x] The check command passes
