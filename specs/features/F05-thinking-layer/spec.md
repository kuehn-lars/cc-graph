# F05 Thinking layer

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Approved | v0.4 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.301 | F01, F03, F08, F14 |

## Problem

When Claude changes a file, the reasoning that led there has already scrolled away, and nothing ties a piece of thinking to the files it was about. A reviewer who wants to know "what was it thinking when it touched this?" has to search the transcript.

## Solution

Claude's visible thinking is kept per step as a short excerpt and linked to the files that step went on to read, edit or write. The newest excerpts show in the list, and a file's card shows the thinking that led to it. Claude Code streams thinking text only when its own `showThinkingSummaries` setting is on; otherwise the pane says thinking is hidden and names that setting, instead of showing nothing. Capture can be switched off.

## User stories

1. As a reviewer, I want the thinking behind a step linked to the files that step touched, so that I can read why a file was changed.
2. As a reviewer, I want the newest thinking excerpts in the list, so that I can follow Claude's line of thought while it works.
3. As a reviewer, I want each excerpt to say which turn it came from, so that I can place it next to the conversation.
4. As a reviewer, I want an excerpt to say how much of the thinking it left out, so that I know when to look in the transcript for the rest.
5. As a developer, I want streaming exactly as fast and complete with CC Graph as without it, so that capture costs me nothing.
6. As a developer, I want a bug in capture never to cut or change Claude's reply, so that installing the mod is safe.
7. As a privacy-minded developer, I want only short excerpts kept, in memory only, and a switch to turn capture off, so that I decide what the mod holds.
8. As a privacy-minded developer, I want `/clear` to drop every excerpt, so that a new conversation starts with nothing from the old one.
9. As a developer, I want the pane to say when thinking is hidden and which setting shows it, so that an empty section is never mistaken for "Claude didn't think".
10. As a developer working with subagents, I want only the main conversation's thinking kept, so that a burst of subagent steps does not push out what Claude itself was thinking.

## Requirements

- **F05-R1** While `captureThinking` is on, the mod hooks `turn.step` as an async generator that yields every chunk it reads from `next(e)`, unchanged and in order, and returns the stream's result unchanged, even if recording fails.
- **F05-R2** For a main-loop step (no `e.agentId`), the mod joins the `text` of the step's `thinking` chunks per block `index`, and when the step ends stores one note: the non-empty blocks joined by a blank line and cut to their first 400 characters (code points), the joined length as `chars`, the `turn` key's value as `turn`, and the step's `index` as `step`.
- **F05-R3** The mod sets a note's `files` to the paths named by the `file_path` or `notebook_path` input of the step result's `toolUses`, normalized by I4, in order and without duplicates.
- **F05-R4** The mod keeps the newest 20 notes and writes thinking nowhere but `$.state` (I8, NFR-S2).
- **F05-R5** While `captureThinking` is off, the mod registers no `turn.step` hook at all, and the list view draws no Thinking section.
- **F05-R6** If a main-loop step streams `thinking` chunks and every one has empty text, then the mod stores no note, and while `thinking` holds no note it adds the footer note "Thinking is hidden: turn on showThinkingSummaries to see it." once.
- **F05-R7** If a step carries `e.agentId`, then the mod forwards it and records nothing.
- **F05-R8** The list view's Thinking section, between Memory and Blind spots, shows the newest 3 notes, newest first, each one row `turn ‹turn›  ‹first non-empty line of text›  → ‹file names, comma-separated›` no wider than the pane (F08-R6); the arrow part is left out when `files` is empty. A row that does not fit cuts the text and closes it with "…", so the arrow part stays whole; only when `turn ‹turn›  …  → ‹file names›` does not fit either is the whole row cut at the pane's edge. With no note, the section shows F08-R7's "No thinking captured yet."
- **F05-R9** When the mod stores a note, it removes the footer note of F05-R6.
- **F05-R10** If the stream beneath rejects or is closed before its result, then the mod stores nothing for that step and lets the rejection or close pass unchanged.
- **F05-R11** When F03-R7 resets the state, `thinking` becomes empty.

## Acceptance criteria

- **F05-AC1** Given a step streaming text, thinking, tool, input, stop and engine chunks, then the chunks leaving the hook equal the chunks entering it, in the same order, and the result is the same object.
- **F05-AC2** Given two thinking chunks "Look at " and "login.ts" in block 0, then one note with text "Look at login.ts".
- **F05-AC3** Given a 2,000-character thinking block, then the note's text is 400 characters and `chars` is 2000.
- **F05-AC4** Given a step with `agentId` `agent_1` streaming thinking, then no note is stored and every chunk passes.
- **F05-AC5** Given 25 main-loop steps with thinking, then the newest 20 notes remain and the oldest 5 are gone.
- **F05-AC6** Given a step whose result has the `toolUses` `{ name: 'Read', input: { file_path: '/w/src/a.ts' } }` and `{ name: 'Edit', input: { file_path: '/w/src/a.ts' } }` and the working directory `/w`, then its note's `files` is `['src/a.ts']`.
- **F05-AC7** Given a step whose thinking chunks all have empty text and no note held, then no note is stored and the footer reads "Thinking is hidden: turn on showThinkingSummaries to see it."; a second such step adds no second footer note.
- **F05-AC8** Given four notes, of turns 1 to 4, the newest in turn 4 with text "Check the limiter.\nThen the route." and `files` `['src/auth/login.ts', 'src/middleware/rateLimit.ts']`, then the Thinking section shows three rows, the first `turn 4  Check the limiter.  → login.ts, rateLimit.ts`, and no row of turn 1.
- **F05-AC9** Given the footer note of F05-AC7, when a later step streams thinking "Read the test.", then a note is stored and the footer note is gone.
- **F05-AC10** Given a step whose stream beneath yields a thinking chunk and then throws, then the hook yields that chunk, the same error reaches the caller, and no note is stored (DERIVED: no recording fails mid-stream).
- **F05-AC11** Given three notes, when `classic.SessionStart` fires with `source` `clear`, then `thinking` is empty.
- **F05-AC12** Given `captureThinking: false`, then the list view draws no Thinking heading and no "No thinking captured yet." line.
- **F05-AC13** Given a note of turn 1 with the text "For step 1, I need to read two files using absolute paths within the sample-app directory." and `files` `['src/auth/login.ts', 'src/config.ts']`, at 48 columns, then its row is `turn 1  For step 1, I ne…  → login.ts, config.ts` (DERIVED: the text of the `shown` recording's first step, cut).

## Implementation decisions

- **Wiring only, one pure helper.** The `turn.step` hook lives in the wiring module with every other `$` call. Building a note from the collected blocks, the step's tool uses and the turn is a pure `model` function (blocks, tool uses, working directory, turn, step → `ThinkingNote` or nothing); the Thinking section is a pure `render` function in the list view.
- **Forward with `for await` and `.result`.** `yield*` would forward everything but hide the chunks. The hook iterates `next(e)` with `for await`, looks at each chunk, yields it, and returns the stream's `result` once the stream ends. `for await` closes the stream beneath when the caller stops reading, so an interrupted turn behaves as without the mod. The types also say a hook that fails mid-stream is left and the rest comes from beneath; the per-chunk recording still sits in a `try`, so a recording bug costs only the note, never a chunk.
- **Constant work per chunk.** The hook keeps, per block, at most the first 400 code points and a running length, so a long thinking block costs no more than a short one (NFR-P2). The note is built and written once, after the stream's result: one step, one write of `thinking`.
- **Files come from the step's own tool uses.** `turn.step`'s result lists the tool calls the response asked for, with their inputs but without call ids, so the link is made from the inputs at the end of the step. No join across events is needed, and a note names the files Claude chose to touch in that step, whether or not each call was later allowed.
- **Excerpts, not transcripts.** 400 characters is enough to recognize a line of thought and keeps NFR-P5 and NFR-S2 easy to hold. The full length is kept so the card (F11-R1) can say how much was cut.
- **Hidden thinking is a footer note.** `ui.render` only reads state, so "hidden" must be held somewhere; the existing `notes` key already carries one-line notes with the same add-once pattern as "blind spots need git". It goes away with the first visible note, since a session whose display setting changes can mix both. A step with no thinking chunks at all says nothing: adaptive thinking skips simple steps (S2), and that is not hiding.
- **No hook when off.** Options are fixed per activation and a change reloads the module, so the hook is simply not registered: zero cost, nothing to trust. The Thinking section is left out then, as Blind spots is with `blindSpots` off.
- **The graph draws no thinking.** Notes are text; the list and the card (F11) carry them. The graph views (F09, F10) are unchanged.

## Testing decisions

- **Seam:** the engine test kit, the one F01 to F07 use. The test registers its own `turn.step` hook beneath the mod, an `async function*` that yields recorded chunks and returns a recorded result, and stands in for the model; it reads the stream from `$.turn.step({ turnId, index, model, messageCount })`, compares chunks and result (F05-AC1, AC4, AC10), then reads the `thinking` and `notes` keys. `turn` is seeded through `state.get` as the compaction tests seed it.
- The list criteria (F05-AC8, AC12) render through `$.ui.mount` as the other `tests/ui` tests do; F05-AC11 raises `$.classic.SessionStart({ source: 'clear' })`.
- What the seam cannot carry: an `engine` chunk is an opaque ref the engine hands only to links that pulled it from beneath, so the test's stand-in model streams the recordings without theirs (F05-AC1 covers the other five kinds; the hook forwards every chunk alike). A stand-in that throws is left by the kit, so F05-AC10's error is the one the kit raises beneath the mod, and the test checks that exactly that error reaches the caller.
- NFR-P2's timing test streams 2,000 chunks through the same seam, in `tests/bench`.
- Fixtures: `fixtures/sessions/thinking.ts`, recorded in spike S2. `shown` (summaries on) gives the chunks and results of F05-AC1 to AC4 and AC6; `hidden` gives F05-AC7's empty chunks; both carry a subagent's steps for F05-AC4. F05-AC5's 25 steps, AC8's texts and AC10's throw are derived from those recordings and marked so.
- Tests check what leaves the hook and what lands in state, never how the hook collects blocks.

## Mods API used

| Need | Event or method |
| --- | --- |
| Thinking chunks | `turn.step` as an async generator (`StreamHook`); chunks `{ kind: 'thinking', index, text }` |
| Forwarding | `next(e)` is a `HookStream`: iterated with `for await`, its `result` returned |
| Files of the step | The step result's `toolUses[].input` (`file_path`, `notebook_path`) |
| Main loop or subagent | `e.agentId` on `TurnStepInput` |
| Turn number | The `turn` key, set at `turn.start` |
| Store notes, footer note | `$.state` through `update`: the `thinking` and `notes` keys |
| Reset | `classic.SessionStart` with `source` `clear`, `resume` or `fork` (F03-R7) |

## Data model changes

None to add: [02 Data model](../../02-data-model/spec.md) already holds `ThinkingNote` and the `thinking` key (newest 20, I8). The footer note "Thinking is hidden: turn on showThinkingSummaries to see it." joins the `notes` key's texts.

## Manual check

1. Run `claude --plugin-dir <this repository> --settings '{"showThinkingSummaries":true}'` in a copy of `fixtures/sample-app` (see [04 Reference session](../../04-reference-session/spec.md)), with Haiku: it thinks in every step (S2).
2. Ask Claude a question that makes it read two files.
3. `/graph list` shows the newest notes, each with its turn and naming the files its step touched.
4. Claude's reply streams as fast as with the mod disabled.
5. Run again without `--settings`: the footer says "Thinking is hidden: turn on showThinkingSummaries to see it."
6. Turn `captureThinking` off in `/config`: the Thinking section is gone and no new notes appear.
7. `/clear`, turn capture back on: the section reads "No thinking captured yet."

## Out of scope

- Thinking of subagents. Their context is not the main conversation's, and their steps are many.
- Showing whole thinking blocks. The excerpt is the product; the transcript keeps the full text.
- Linking thinking to files a step names only inside a `Bash` command, or searches with `Grep` and `Glob`. A note names the files the step read, edited or wrote by path.
- Thinking on the graph views; the card shows it per file (F11).

## Open questions

- [x] **F05-Q1** Which models and settings stream thinking text to a mod, and which only empty blocks? **Answered by spike S2** ([spike-s2.md](spike-s2.md), 2.1.302, 2026-10-17): text streams only when Claude Code asks for thinking summaries, through `"showThinkingSummaries": true` or `--thinking-display summarized`; without it Opus, Sonnet and Haiku 5.5 all stream `thinking` chunks with empty text, interactive and `-p` alike. Within one step the chunks are all with text or all without. A hook cannot change the display. F05-R6's footer note therefore names the setting, and the README says it.

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Checked against the 2.1.296 types. Files now come from the step result's `toolUses` inputs (there are no call ids to join on); no hook is registered when capture is off; hidden thinking is said in the pane; moved to v0.4 with the card that shows it.
- 2026-10-17 Review. Checked against the 2.1.301 types (`turn.step` unchanged). Forwarding uses `for await` and the stream's `result`; the hook holds at most 400 code points per block. Hidden thinking moved to a footer note that the first visible note removes (R6, R9), since sessions mix blocks with and without text. Added the list row format (R8, AC8), a failed or closed stream (R10, AC10), reset (R11, AC11) and no section while off (R5, AC12). F05-Q1 now holds the transcript evidence and names the requirements it blocks.
- 2026-10-17 Spike S2 answers F05-Q1 on 2.1.302 (no blocking question left). The hidden note names `showThinkingSummaries`; the manual check sets it; fixtures named. S2 also found that `turn.start` fires for subagents since 2.1.301, which the note's `turn` depends on (see spike-s2.md).
- 2026-10-17 Approved by the owner.
- 2026-10-17 Testing decisions: what the test kit's seam cannot carry (engine chunks, a stand-in's own throw) named for F05-AC1 and AC10.
- 2026-10-17 A recorded first line is longer than the pane, so a row cut at the edge never named its files: the text is cut first and the arrow part kept (R8, AC13). Approved by the owner.
