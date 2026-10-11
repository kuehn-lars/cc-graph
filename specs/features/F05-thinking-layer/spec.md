# F05 Thinking layer

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Review | v0.4 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | F01, F08, F14 |

## Problem

When Claude changes a file, the reasoning that led there has already scrolled away, and nothing ties a piece of thinking to the files it was about. A reviewer who wants to know "what was it thinking when it touched this?" has to search the transcript.

## Solution

Claude's visible thinking is kept per step as a short excerpt and linked to the files that step went on to read, edit or write. The newest excerpts show in the list, and a file's card shows the thinking that led to it. Where a model or setting hides thinking, the pane says so instead of showing nothing. Capture can be switched off.

## User stories

1. As a reviewer, I want the thinking behind a step linked to the files that step touched, so that I can read why a file was changed.
2. As a reviewer, I want the newest thinking excerpts in the list, so that I can follow Claude's line of thought while it works.
3. As a developer, I want streaming exactly as fast and complete with CC Graph as without it, so that capture costs me nothing.
4. As a privacy-minded developer, I want only short excerpts kept, in memory only, and a switch to turn capture off, so that I decide what the mod holds.
5. As a developer, I want the pane to say when thinking is hidden, so that an empty section is never mistaken for "Claude didn't think".

## Requirements

- **F05-R1** While `captureThinking` is on, the mod hooks `turn.step` as an async generator that yields every chunk it reads from `next(e)`, unchanged and in order, and returns the result `next(e)` returned, even if recording fails.
- **F05-R2** For a main-loop step (no `e.agentId`), the mod joins the `text` of the step's `thinking` chunks per block `index`, and when the step ends stores one note: the blocks joined by a blank line and cut to their first 400 characters, the full length as `chars`, the turn number and the step's `index`.
- **F05-R3** The mod sets a note's `files` to the paths named by the `file_path` or `notebook_path` input of the step result's `toolUses`, normalized by I4, without duplicates.
- **F05-R4** The mod keeps the newest 20 notes and writes thinking nowhere but `$.state` (I8, NFR-S2).
- **F05-R5** While `captureThinking` is off, the mod registers no `turn.step` hook at all.
- **F05-R6** If every `thinking` chunk of a step has empty text, then the mod stores no note, and the Thinking section's empty line reads "Thinking is hidden for this model or setting."
- **F05-R7** If a step carries `e.agentId`, then the mod forwards it and records nothing.
- **F05-R8** The list view's Thinking section shows the newest 3 notes, each with its turn, its first line and the files it names.

## Acceptance criteria

- **F05-AC1** Given a step streaming text, thinking, tool and engine chunks, then the chunks leaving the hook equal the chunks entering it, in the same order, and the result is the same object.
- **F05-AC2** Given two thinking chunks "Look at " and "login.ts" in block 0, then one note with text "Look at login.ts".
- **F05-AC3** Given a 2,000-character thinking block, then the note's text is 400 characters and `chars` is 2000.
- **F05-AC4** Given a step with `agentId`, then no note is stored.
- **F05-AC5** Given 25 notes, then the newest 20 remain.
- **F05-AC6** Given a step whose result has one `toolUses` entry `{ name: 'Read', input: { file_path: '/w/src/a.ts' } }` and the working directory `/w`, then its note's `files` is `['src/a.ts']`.
- **F05-AC7** Given a step whose thinking chunks all have empty text, then no note is stored and the Thinking section reads "Thinking is hidden for this model or setting."

## Implementation decisions

- **Files come from the step's own tool uses.** `turn.step`'s result lists the tool calls the response asked for, with their inputs but without call ids, so the link is made from the inputs at the end of the step. No join across events is needed, and a note names the files Claude chose to touch in that step, whether or not each call was later allowed.
- **Manual iteration, not `yield*`.** Forwarding with `yield*` hides the chunks; reading `next(e)` chunk by chunk lets the hook look at each one before yielding it. Recording sits in a `try` so a recording bug can never cut the stream.
- **Excerpts, not transcripts.** 400 characters is enough to recognize a line of thought and keeps NFR-P5 and NFR-S2 easy to hold. The full length is kept so the card can say how much was cut.
- **No hook when off.** Options are fixed per activation and a change reloads the module, so the hook is simply not registered: zero cost, nothing to trust.

## Testing decisions

- **Seam:** the engine test kit. The test's own `turn.step` generator beneath yields recorded chunks and returns a recorded result; the test reads the stream from `$.turn.step({ turnId, index, model, messageCount })` and compares chunks and result (F05-AC1), then reads the `thinking` key.
- NFR-P2's timing test streams 2,000 chunks through the same seam.
- Chunk fixtures are recorded during spike S2 from a model and setting that show thinking, and from one that hides it.

## Mods API used

| Need | Event or method |
| --- | --- |
| Thinking chunks | `turn.step` as an async generator; chunks `{ kind: 'thinking', index, text }` |
| Files of the step | The step result's `toolUses[].input` |
| Main loop or subagent | `e.agentId` |
| Turn number | The `turn` key, set at `turn.start` |

## Data model changes

Adds `ThinkingNote` and the `thinking` key.

## Manual check

1. With a model and settings that show thinking, ask Claude a question that makes it read two files in `fixtures/sample-app`.
2. `/graph list` shows the newest notes, each naming the files its step touched.
3. Claude's reply streams as fast as with the mod disabled.
4. Turn `captureThinking` off in `/config`: no new notes appear.

## Out of scope

- Thinking of subagents. Their context is not the main conversation's, and their steps are many.
- Showing whole thinking blocks. The excerpt is the product; the transcript keeps the full text.

## Open questions

- [ ] **F05-Q1** Which models and settings stream thinking text to a mod, and which only a signature? Evidence so far: most thinking blocks in local session transcripts carry empty text. Spike S2: record `turn.step` chunks for each model and thinking setting available, and state in the README which show thinking.

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Checked against the 2.1.296 types. Files now come from the step result's `toolUses` inputs (there are no call ids to join on); no hook is registered when capture is off; hidden thinking is said in the pane; moved to v0.4 with the card that shows it.
