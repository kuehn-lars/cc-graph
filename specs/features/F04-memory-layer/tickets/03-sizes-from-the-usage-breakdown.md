# 03: Sizes from the usage breakdown

**What to build:** After the turn the nested `CLAUDE.md` has a size instead of "≈?", and a memory file that left the context drops out of the list.

On `session.start`, and on `session.measure` when `changed` holds `context`, the mod calls `$.session.usage({ breakdown: 'summary' })`. It replaces `memory` with one note per `context.breakdown.memoryFiles` entry (path normalized by I4, `type`, `tokens`), and keeps the `reason` of notes that were already there. When the result has no `breakdown`, `memory` stays as it is, and the mod logs only at debug level. The call runs after `await next(e)`, and its write is one `update` of `memory`.

Never `breakdown: 'full'` (F04-R2, NFR-S6). `check-calls.mjs` already scans for it; the AC3 test proves that the scan finds a planted `'full'` and that `hooks/` has none.

Tests answer `session.usage` from beneath with the result recorded in ticket 01. A result without `breakdown` is derived from that recording and marked derived.

Requirements: F04-R1, F04-R2.

**Blocked by:** 01, 02

**Touches:** `register.tsx` (`session.start`, `session.measure`), the memory reducer.

**Status:** blocked

- [ ] F04-AC1 `usage` reports two memory files: `memory` holds two notes with path, type and tokens
- [ ] F04-AC2 a file gone from the breakdown: its note is gone after the next refresh
- [ ] F04-AC3 the hooks source never passes `breakdown: 'full'` (static check)
- [ ] F04-AC6 `usage` with no `breakdown`: `memory` unchanged, nothing logged beyond debug
- [ ] A refresh keeps the "nested" reason from ticket 02 and fills in its tokens
- [ ] `session.measure` without `context` in `changed` calls nothing
- [ ] Every case returns what the handler beneath returned
- [ ] The check command passes
