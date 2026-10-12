# Research: what context holds after a repeated search (F02-R4, F02-R5)

Claude Code 2.1.296, 2026-10-12. Sources, in order of trust: the API reference (`.claude-plugin/types/claude-code/index.d.ts`, "the types"), the tool schemas laid beside it (`.claude-plugin/types/claude-code-tools/index.d.ts`, "the tool types"), the official docs, the installed binary (`~/.local/share/claude/versions/2.1.296`, read with a byte search; short strings quoted, minified names as found), and one headless run.

**Run R1.** A copy of `fixtures/sample-app` in a scratch folder, `git init` and one commit, then:

```text
claude -p --model haiku --allowedTools 'Bash(rg:*)' --output-format json \
  "Use the Bash tool to run exactly this command: rg -n verify src/auth . Then run the exact same command a second time in a separate Bash call. Then reply with only the word done."
```

It cost $0.005 over 3 turns. Session `e5c3a5a6-…`; the transcript JSONL was read under `~/.claude/projects/<copy path>/`.

## Q1: is a repeated Bash result kept or deduplicated?

**Answered: kept verbatim, every time. Bash has no dedup.**

- **Observed (R1):** the transcript holds two `tool_result` blocks, `toolu_01GEinv…` and `toolu_01UrfRA…`, with identical content (the four `rg` lines in full). Neither is a stub, and no attachment or notice sits between them.
- **Observed (R1), request size:** the input tokens of each request (`input + cache_creation + cache_read`) were 28,321, then 28,587, then 28,854. The first search added 266 tokens and the identical second search added 267, so the second copy was sent at full size.
- **Binary:** Bash builds its model-facing result from its own call alone. `mapToolResultToToolResultBlockParam({interrupted, stdout, stderr, …})` trims leading blank lines and trailing space from `stdout`, then appends `stderr` and any abort or background note. It reads no earlier result.
- **The one dedup is Read's, and only Read's:**
  - Tool types 5034–5040: `type: "file_unchanged"`, with "Set when the dedup matched a startup-seeded entry … rather than a prior Read tool_result".
  - Binary: the dedup fires only when `offset` and `limit` equal the earlier read's and the file's mtime is unchanged (`tengu_file_read_dedup`). The model then gets a short stub, and the UI draws "Unchanged since last read".
  - The types (8776–8777) carry the same idea for mentions: `already_read_file`, "the model holds it unchanged, nothing is sent again".
- **Bash's result type (tool types 4368–4404)** has no field like that: `stdout`, `stderr`, `interrupted`, `persistedOutputPath`, `persistedOutputSize`, and so on.

## Q2: is anything cleared or shrunk before a full compaction?

**Answered: three mechanisms exist in 2.1.296. One applies per call and is on. Two clear old results across the conversation, and both are behind remote flags, off for this account. None of them raises an event a plugin can hook.**

The docs say it in general terms: Claude Code "clears older tool outputs first, then summarizes the conversation if needed" (https://code.claude.com/docs/en/how-claude-code-works, "When context fills up").

### 1. Large output persisted to a file (per call, on)

- **Threshold:** Bash's `maxResultSizeChars` is the `bashOutputMaxChars` setting, default 30000 and clamped to 4000–128000 (binary: `kfr=30000`, `_jn=4000`, `l5e=128000`). The setting's own description says "Output past this is saved to a file and Claude receives a short preview plus the path."
- **What the model reads:** `<persisted-output>`, then `Output too large (<size>). Full output saved to: <path>`, then a preview of the first 2,000 characters (`lCe=2000`), cut at the last newline when that newline falls in the second half. It ends with `</persisted-output>`. This session's own WebFetch result arrived in exactly this form ("Preview (first 2KB)").
- **Per-message budget (binary):** when the tool results of one user message together pass a budget, the largest are persisted the same way. The log line is "Per-message budget: persisted N tool results across M over-budget message(s)". The budget is probably `Sjn=200000` characters; that constant was matched by name, not traced, so it is **unconfirmed**.
- **Applies to:** the call as it returns, so a plugin sees it on `tool.call`:
  - `result.persistedOutputPath` and `result.persistedOutputSize` are set (tool types 4401–4404).
  - `text` is "the result as the model reads it (text blocks joined)" (types 12752–12756).
  - **Inferred from the binary:** the preview is cut from `stdout`, so `result.stdout` can hold more than the model saw. See "For F02", point 5.

### 2. Client-side "keep-recent" microcompact (flag `tengu_hazel_osprey`, off)

- **What it does (binary, `createContextHintController`):**
  - It runs on the main thread only (`querySource` starts with `repl_main_thread`). The request carries the `context-hint-2026-04-09` beta.
  - When the API rejects the request (422/424) or the stream falls back, the client clears every compactable tool result except the last 5 (`_=5`), and only when that saves at least 20,000 tokens (`VLn=20000`). Then it retries.
  - Each cleared result becomes a `<persisted-output>` pointer ("Tool result saved to: … Use Read to view"), or `[Old tool result content cleared]` when the save fails.
  - The log line is "[KEEP-RECENT MC] context_hint trigger, cleared N tool results (~T tokens), kept last K"; telemetry is `tengu_time_based_microcompact`.
- **Which tools:** the set is `Et=new Set([rt,...p_,Jr,co,Cf,fr,ht,Xt])`, which resolves to `Read`, `Bash` and `PowerShell` (`p_=[Be,Tt]`, `Be="Bash"`, `Tt="PowerShell"`), `Grep`, `Glob`, `WebSearch`, `WebFetch`, `Edit` and `Write`. **Bash is included.** The minified names were mapped by their nearest definitions and the chunk's imports, which is strong but not proof.
- **State:** `~/.claude.json` `cachedGrowthBookFeatures.tengu_hazel_osprey: false` on 2026-10-12.
- **Observable to a plugin: no.** The types have no hit for `microcompact`, `clear_tool_uses`, `context_management`, `persisted-output` or `tool_result_clear` (grep over the types: 0). It reaches SDK clients as an `@internal` `hint_clears` message, and it is not a `session.append` door (types 10564). It does not raise `session.compact`.

### 3. Server-side clearing after idle (flag `tengu_zany_pike`, off)

- **What it does (binary):**
  - After the session sits idle for more than `minIdleSeconds: 3900` (65 minutes, past the prompt cache), the client adds the context edit `clear_tool_uses_20250919` to the request, with `keep: 5` tool uses and `clear_at_least: 20000` input tokens.
  - `exclude_tools` holds `GetTask`, `Poll`, and the names of batched tool uses. Bash is not excluded.
  - The API docs: "the API automatically clears the oldest tool results … replaces each cleared result with placeholder text". The clearing runs "server-side before the prompt reaches Claude. Your client application maintains the full, unmodified conversation history". The response reports `context_management.applied_edits[].cleared_tool_uses` (https://platform.claude.com/docs/en/build-with-claude/context-editing).
- **State:** the flag is absent from the cached features, so the mode reads `unknown`, which acts as off unless an earlier response already reported a clear (`ar()`, `Mgs`).
- **Observed (R1):** every assistant row had `context_management: null`.
- **Observable to a plugin: no documented field.** The transcript, `$.session.messages()` and `tool.call` keep the full results. **Unconfirmed:** whether a plugin can read `applied_edits` anywhere.

**Nothing else** is a history edit. The binary's history-edit claims are `compact`, `snip`, `tool_result_clear`, `rewind`, `clear` and `abort_strip`, and `tool_result_clear` is raised only by mechanism 2.

## Q3: how does a full compaction treat earlier Bash results?

**Answered: they are summarized away unless the compaction keeps their message. None comes back.**

- **Docs** (https://code.claude.com/docs/en/context-window, "What survives compaction"): the summary "replaces the verbatim conversation: full tool outputs and intermediate reasoning are gone". Re-reads after a compaction cover only "Files Claude read or edited … up to five, most recently modified first".
- **Types 10765–10767:** `SessionCompacted.messages` is "its summary and the messages it kept". A Bash `tool_use` among the kept messages is still in context, with its result.
- **Spike S1** ([`../F03-context-layer/spike-s1.md`](../F03-context-layer/spike-s1.md)): three manual compactions kept only the summary and one assistant reply (`kept: 0`). Only `Read` content and written files were re-attached, as `file` attachments; a search output never was.
- **Consequence for F03-R1:**
  - Moving `search` nodes to `compacted` is right.
  - A search node survives only if a kept message holds its call. That needs the search's `tool_use_id`, but `readId` is defined as the id of "the read".
  - **Unconfirmed:** whether `compact_kept_tail` (seen in the binary's compaction stages) keeps a recent tail verbatim in other trigger paths, such as `auto` or reactive.

## For F02

**Rule: one search call adds one copy.** Context holds every call's output in full (Q1). Nothing removes it before a compaction except the two clearing mechanisms, which are off and invisible to plugins (Q2). A compaction drops all of it unless the call's message is kept (Q3). So `hits` and `tokens` add up per call, and they start again from zero when the node comes back from a state where none of its earlier search output is still in context.

| Node before the hit | State after | `hits` | `tokens` | Evidence |
| --- | --- | --- | --- | --- |
| `search` | `search` | `+=` this call's hits | `+=` `ceil(chars of this call's hit lines / 4)` | R1: the second identical copy cost 267 tokens, the first 266; no Bash dedup (binary) |
| `read` | `read` | `+=` this call's hits | unchanged (the file read's size) | I1 measures files. The extra copy is real but is a subset of content already counted; `session.measure` holds the true fill |
| `partial` | `partial` | `+=` this call's hits | unchanged | as for `read`; the range read stays what `tokens` describes |
| `ghost`, `unread` (no earlier search output) | `search` | `=` this call's hits | `=` this call's estimate | nothing of the file was in context |
| `compacted` | `search` | `=` this call's hits (reset) | `=` this call's estimate (reset) | Q3: the earlier outputs and reads are gone; only the summary remains |

Notes the rule implies:

1. **Hits count copies, not distinct lines.** The same line found twice counts twice, because the model holds it twice. "N search hits" then reads as "N hit lines in context". Deduplicating by line would make `tokens` undercount (R1).
2. **Compacted, then searched:** "never opened" can be false here, because the node may have been read before the compaction. User story 5 says "only has the hits back". Proposed `seen`: "N search hits since compaction" when the node was ever `read`, `partial` or `compacted`; otherwise "N search hits, never opened".
3. **`readId` on a search node:** set it to the latest search call's `tool_use_id`, so F03-R1's kept-messages check works for search nodes. When that call is kept, the node stays `search`, though `tokens` may then count older copies that were dropped. That gap is accepted: compactions in S1 kept nothing.
4. **Clearing (Q2, mechanisms 2 and 3):** not modelled. If either flag turns on, the graph overstates old search tokens. The window fill from `session.measure` stays exact. Name it as a known limit, not a requirement.
5. **F02-R9, inline only:**
   - When `result.persistedOutputPath` is set, the model saw a 2,000-character preview, and `stdout` may hold more (inferred from the binary, **unconfirmed** by a run).
   - In that case, parse `text`, the tool result "as the model reads it" (types 12752–12756), or cut `stdout` to the preview.
   - Otherwise keep `stdout`: `text` also carries `stderr` (binary).

**Spec changes this implies (for the owner):**

- **F02-R4:** spell out the reset: "A `ghost`, `compacted` or `unread` node becomes `search` with `hits` set to this call's hits. A `read`, `partial` or `search` node keeps its state and adds them." Add an acceptance criterion: "Given `src/a.ts` is `search` with 2 hits, when the same search runs again, then `hits` is 4 and `tokens` doubles."
- **F02-R5:** "adds `ceil(characters of this call's hit lines / 4)` to a `search` node's `tokens`; a `read` or `partial` node's `tokens` is unchanged". Add the `seen` wording from note 2.
- **F02-R9:** "when `result.persistedOutputPath` is set, parses only the preview the model read (`text`)", instead of `stdout`.
- **F03 / 02 Data model:** let `readId` hold the latest search call's id for `search` nodes (note 3). Under Known limits, add tool-result clearing (keep-recent microcompact, clearing after idle), which no event reports.
