# Spike S1: what `file` and `edited_text_file` attachments say (F03-Q1, F07-Q1)

Claude Code 2.1.296, 2026-10-11 and 12. Probe mod kept outside the repository (never merged). It logged every `prompt.attachment` (type, origin, `agentId`, the whole text for `file` kinds), every `session.compact` result and every `tool.call`. Model Haiku, in a copy of `fixtures/sample-app`, in three set-ups:

- **A. Headless, a process per turn** (`claude -p`, then `--resume`). Turn 1 reads `src/routes/index.ts` lines 1 to 40, then `login.ts`, `sessions.ts`, `redis.ts` and `config.ts` whole, writes `src/middleware/rateLimit.ts` and edits `login.ts`. Then an outside edit of `config.ts`, turn 2, `/compact`, an outside edit of `login.ts`, and turn 3.
- **B. Headless, one process** (`--input-format stream-json`). Reads `config.ts` and `login.ts` whole, then an outside edit of `config.ts`, a turn, `/compact`, an outside edit of `login.ts`, and a turn.
- **C. Interactive terminal session.** Reads `config.ts` whole, then an outside edit of it, and a turn.

Each outside edit appended one comment line to the file.

## F03-Q1: `file` attachments after a compaction

**Answered.** The text names the path in a stable form: the first line holds it as JSON, absolute.

```text
Called the Read tool with the following input: {"file_path":"/private/var/folders/…/sample-app/src/auth/login.ts"}
Result of calling the Read tool:
1	// Login and logout: checks a password, then opens or closes a session.
2	import { hashPassword, verifyPassword } from './password'
```

- **Path:** parse the `{"file_path":…}` object on the first line, then normalize it as I4 says. The rest is the `Read` tool's numbered output.
- **When:**
  - The text is built at the compaction. `config.ts` held the outside edit made before `/compact`; `login.ts` lacked the one made after it.
  - It is raised as `prompt.attachment` (`origin.kind: 'engine'`, no `agentId`) on the next main-loop request: after the resume in A, and in the same process in B.
- **Which files:**
  - A: five, `login.ts`, `rateLimit.ts`, `config.ts`, `redis.ts` and `sessions.ts`. These are the files Claude read whole or wrote; `routes/index.ts`, read with a range, did not come back.
  - B: `config.ts`, `login.ts` and `src/auth/CLAUDE.md`. A nested memory file comes back as a `file` attachment too.
- **No reference-only form:** no `compact_file_reference`, and no other type naming compaction, was raised. Every re-attached file carried its content.
- **The compaction itself:**
  - `trigger: 'manual'`. Tokens went from 34,077 to 5,591 in A, from 33,942 to 5,616 in A's repeat, and from 30,597 to 4,920 in B.
  - Two messages were kept: the summary (`user`) and an `assistant` reply. Neither holds a tool use, so `kept: 0`.
- **Side findings:**
  - The summarizer's own request raised a `nested_memory` attachment carrying an `agentId` (A). Filters that keep only the main loop (no `agentId`) leave it out.
  - `classic.SessionStart` with `source: 'compact'` fires during the compaction, before `session.compact`'s `next(e)` resolves.

A repeat of A re-attached the same five files in the same form. Its texts are in [`fixtures/sessions/spike-s1/`](../../../fixtures/sessions/spike-s1/), one file per attachment, with the compaction's result in `session-compact.json`, ready for the F03-AC11 and RS-4 fixtures.

## F07-Q1: `edited_text_file`

**Not observed; stays open.** In A, B and C, a file Claude had read whole was changed outside Claude before the next turn, and that request carried no `edited_text_file`. In C, the session's own transcript holds no such row either, so the engine did not produce one; the hook did not merely miss it. F07-R7 cannot be relied on in 2.1.296 as specified. Conditions this spike did not try: a connected IDE, a change other than an append, and a file read with a range.

## Proposed spec changes (for the owner)

1. **F03:** check F03-Q1 with this answer. F03-R3 reads the path from the first line's `{"file_path":…}`.
2. **04 Reference session:** the story re-attaches only `login.ts` and `rateLimit.ts`. The engine re-attached up to five files read whole or written, here also `redis.ts`, `config.ts` and `sessions.ts`. RS-4, the golden graph and the scripted fixture should follow what the engine does: either replay the five captured attachments and change the expected states, or keep two attachments and say the fixture trims them.
3. **F04:** a re-attached `CLAUDE.md` arrives as a `file` attachment. F03-R3 touches only `compacted` file nodes, so a memory file is unaffected; F04 may say so.
4. **F07:** keep F07-Q1 open and say F07-R7 is unconfirmed in 2.1.296, before F07 is approved.
