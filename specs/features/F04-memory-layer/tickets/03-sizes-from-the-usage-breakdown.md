# 03: Sizes from the usage breakdown and the nested attachment

**What to build:** After the turn the nested `CLAUDE.md` has a size instead of "≈?", and a memory file that left the context drops out of the list.

On `session.start`, and on `session.measure` when `changed` holds `context`, the mod calls `$.session.usage({ breakdown: 'summary' })`. It replaces the notes the breakdown lists with one note per `context.breakdown.memoryFiles` entry (path normalized by I4, `type`, `tokens`), keeping the `reason` of notes that were already there. A note with reason "nested", "path rule" or "import" that the breakdown does not list stays with its `tokens` (the recording shows the breakdown never lists a nested file); any other unlisted note is removed.

On `prompt.attachment` of type `nested_memory` without an `agentId`, the note for the path in `Contents of <path>:` gets `tokens` = `estimateTokens(text)` (`hooks/parse/measure.ts`); no note, no change (F04-R6). Its own `update` of `memory`. When the result has no `breakdown`, `memory` stays as it is, and the mod logs only at debug level. The call runs after `await next(e)`, and its write is one `update` of `memory`.

Never `breakdown: 'full'` (F04-R2, NFR-S6). `check-calls.mjs` already scans for it; the AC3 test proves that the scan finds a planted `'full'` and that `hooks/` has none.

Tests answer `session.usage` from beneath with the result recorded in ticket 01. A result without `breakdown` is derived from that recording and marked derived.

Requirements: F04-R1, F04-R2, F04-R6.

**Blocked by:** None (01 and 02 are done)

**Touches:** `register.tsx` (`session.start`, `session.measure`, `prompt.attachment`), the memory reducer. The recorded nested attachment is in `fixtures/sessions/reference.ts` (`prompt.attachment`, `nested_memory`).

**Status:** ready-for-agent

- [ ] F04-AC1 `usage` reports two memory files: `memory` holds two notes with path, type and tokens
- [ ] F04-AC2 a file gone from the breakdown: its note is gone after the next refresh
- [ ] F04-AC3 the hooks source never passes `breakdown: 'full'` (static check)
- [ ] F04-AC6 `usage` with no `breakdown`: `memory` unchanged, nothing logged beyond debug
- [ ] F04-AC7 the nested attachment sizes the "nested" note; an attachment with an `agentId`, or for a path with no note, changes nothing
- [ ] F04-AC8 a refresh keeps an unlisted "nested" note with its tokens, and drops an unlisted "at start" note
- [ ] A refresh keeps the reason of a note it lists
- [ ] `session.measure` without `context` in `changed` calls nothing
- [ ] Every case returns what the handler beneath returned
- [ ] The check command passes
