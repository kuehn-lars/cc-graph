# 03: Non-text reads and file_unchanged

**What to build:** Images, PDFs, PDF page ranges and notebooks Claude reads show as `read` with `tokens: null` and a `seen` that names the kind ("image", "PDF pages 3 to 7", "notebook, 12 cells"), so the pane admits what it cannot estimate. A `file_unchanged` answer changes nothing about a node that exists, so a compacted file stays compacted. A path with no node becomes `read`, "unchanged since an earlier read".

Requirements: F01-R2, F01-R3.

F01-AC12 needs a `compacted` node, and only F03 produces that state. The test seeds the graph instead: a `state.get` hook from the test sits beneath the mod and answers the first read of `graph` with a seeded value at version 0 (as `{ value: { value, version } }`, the shape the kit's `next(e)` returns), then passes on. Confirmed: `seedGraph` in `tests/events/kit.ts`. The `file_unchanged` result is derived from the type (`fixtures/tool-results/file-unchanged.ts`), and the tests say so.

**Blocked by:** 02 Text Read becomes a node

**Status:** done

- [x] F01-AC11 image read is `read`, `tokens: null`, "image"
- [x] F01-AC12 a `compacted` node answered `file_unchanged` stays `compacted` (derived result, seeded graph)
- [x] F01-AC23 `file_unchanged` on a path with no node makes it `read`, `tokens: null`, "unchanged since an earlier read"
- [x] `pdf`, `parts` and `notebook` results give the `seen` wording of F01-R2 (no AC of their own; one test each is enough)
- [x] The check command passes
