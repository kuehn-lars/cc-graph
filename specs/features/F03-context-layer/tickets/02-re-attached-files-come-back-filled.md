# 02: Re-attached files come back filled

**What to build:** After a compaction, Claude Code re-attaches the files Claude had read whole or written. In spike S1 and the reference session that was five of them. Each comes back `●` with "re-attached after compaction", sized from what was attached. Nothing else changes:

- a re-attached memory file such as `src/auth/CLAUDE.md`, which is not a `compacted` file node;
- a file attachment for a node that is not `compacted` (an `@` mention, which F01 handles through `prompt.mention`);
- an attachment carrying an `agentId`.

This ticket adds a `prompt.attachment` hook in the wiring, matched on `type: 'file'`. In this build `file` is an undeclared kind (`{ type, text, origin, agentId? }`). The hook awaits `next(e)`, skips anything with `agentId`, and hands `e.text` to a pure parser. The parser reads the JSON object on the first line (`Called the Read tool with the following input: {"file_path":…}`), takes `file_path` and normalizes it by I4. A text whose first line doesn't parse adds nothing. The reducer sets a `compacted` node to `read`, with `seen` "re-attached after compaction" and `tokens` = `estimateTokens(text)`, and leaves every other node as it is. One attachment means at most one `update` of `graph`.

Fixtures: the recorded texts, never typed by hand. Use the five `file` rows of process 3 in `fixtures/sessions/reference.ts` with that recording's cwd, or `fixtures/sessions/spike-s1/` with the spike's cwd. The `nested_memory` and `instructions` rows of the same recording, and the summarizer's rows carrying `agentId` (process 2), serve as the cases that must change nothing.

Requirements: F03-R3.

**Blocked by:** 01 A main-loop compaction hollows what it did not keep

**Status:** ready-for-agent

- [ ] Parser cases over the recorded texts: the absolute path inside the cwd comes out relative; a text with no JSON first line gives nothing
- [ ] F03-AC11 a `compacted` `src/a.ts` re-attached is `read` with `seen` "re-attached after compaction" and the text's tokens
- [ ] A `file` attachment naming a `read`, `search` or missing node changes nothing
- [ ] A `file` attachment for `src/auth/CLAUDE.md` changes nothing, and so does one with `agentId`
- [ ] Every case returns what the handler beneath returned
- [x] The check command passes
