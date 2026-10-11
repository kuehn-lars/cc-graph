# F11 Detail card and actions

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Review | v0.4 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | F05, F06, F07, F08, F14 |

## Problem

Seeing that a file is a blind spot is half the job; the other half is doing something about it. Today that means finding the path, typing it into the prompt, or switching to the editor and hunting for the changed line, and asking Claude "why did you change this?" puts the question into the conversation and steers it.

## Solution

Selecting a node opens a card with everything known about it: what Claude saw, what changed and why, what it imports and what imports it, the thinking and decisions linked to it. Three keys act on it: put ` @path ` into the prompt, ask Claude why in a side question that never enters the conversation, or open the file in the editor at the changed line.

## User stories

1. As a developer, I want one place with everything known about a file, so that I don't piece it together from the list and the graph.
2. As a developer steering Claude, I want one key to put ` @path ` into my prompt, so that pointing Claude at a blind spot takes a second.
3. As a reviewer, I want to ask why Claude touched a file without adding to the conversation, so that I can question it without steering it.
4. As a cautious developer, I want "Ask why" to be the only model call and to make exactly one per press, so that the mod never spends my quota on its own.
5. As a developer, I want one key to open the file in my editor at the changed line, so that I can check the change myself.
6. As a developer, I want clear words when an action fails, so that I know what to do next.

## Requirements

- **F11-R1** While `selected` names a file node, the pane shows its card: the path; the state in words; "≈tokens" or "size unknown"; `seen`; the change badge and `reason`; "Imports" and "Imported by", each file marked "(never opened)" when a ghost and "(path guessed)" when the edge is guessed; the agents that touched it (F15); linked decisions (F12); and the newest 3 thinking notes that name it (F05), each saying "of ‹chars› characters" when cut. A part with nothing to show is left out.
- **F11-R2** When `m` is pressed on a selected file, the mod calls `$.prompt.fill({ text: ' @‹path› ', mode: 'insert' })` once. It never submits the prompt.
- **F11-R3** When `w` is pressed on a selected file and no answer is pending, the mod sets `why` to pending and calls `$.model.fork` once with the prompt: "In one short paragraph, why did you read or change ‹path› in this conversation? It was touched in turns ‹turns›. Answer from what you remember; do not plan further work." While an answer is pending, `w` does nothing.
- **F11-R4** When the fork answers `isAnswered: true` and `selected` still names that path, the card shows the text under the label "Side answer, not added to the conversation". If `selected` changed meanwhile, then the mod drops the answer and clears `why`.
- **F11-R5** When the fork answers `isAnswered: false`, the card says why: `nothing-to-fork` "Nothing to ask yet: the conversation has no answer so far.", `api-error` "The request failed (HTTP ‹status›).", `empty-reply` "The answer was empty.", `aborted` "The request was stopped."
- **F11-R6** When `o` is pressed on a selected file, the mod splits the `editorCommand` setting into arguments on whitespace, then substitutes `{path}` (the absolute path) and `{line}` (the node's `line`, or 1) inside each argument, and calls `$.process.run(argv, { timeoutMs: 10000 })`. A substituted value never creates a new argument (NFR-S4).
- **F11-R7** If the editor command cannot start or exits non-zero, then the mod shows a toast "Couldn't open the editor: ‹first line of stderr, or the reason›".
- **F11-R8** While `selected` names a decision (F12), the card shows its title, `because` and linked files, and offers no `m`, `w` or `o`.
- **F11-R9** When `x` is pressed, the mod clears `selected` and the card closes.
- **F11-R10** The keys `m`, `w` and `o` are drawn only while a file is selected; the `w` button's label says it makes a model call.

## Acceptance criteria

- **F11-AC1** Given `src/api/users.ts` is a ghost importing `src/auth/login.ts`, then the card for `login.ts` lists `src/api/users.ts (never opened)` under "Imported by".
- **F11-AC2** Pressing `m` on `src/a.ts` calls `$.prompt.fill` once with ` @src/a.ts ` and `mode: 'insert'`, and raises no `prompt.submit`.
- **F11-AC3** Pressing `w` makes exactly one `$.model.fork` call, and its text shows in the card under "Side answer, not added to the conversation".
- **F11-AC4** No `$.model` call happens without a press: the source has one `$.model.fork` call site, inside the `w` handler, and a replay of the reference session makes zero `model.fork` calls.
- **F11-AC5** Given the editor command exits with code 1 and stderr "code: not found", then a toast says "Couldn't open the editor: code: not found" and nothing reaches the transcript.
- **F11-AC6** Pressing `w` twice while the first answer is pending makes one call, not two.
- **F11-AC7** Given the fork answers `{ isAnswered: false, reason: 'api-error', status: 529 }`, then the card says "The request failed (HTTP 529)."
- **F11-AC8** Given `w` was pressed on `src/a.ts`, when the selection moves to `src/b.ts` before the answer arrives, then the answer is not shown and `why` is cleared.
- **F11-AC9** Given the working directory `/w`, `editorCommand` `code -g {path}:{line}`, and `src/my file.ts` with `line` 3, when `o` is pressed, then `process.run` receives `['code', '-g', '/w/src/my file.ts:3']`.
- **F11-AC10** Pressing `x` clears `selected` and the card is no longer drawn.

## Implementation decisions

- **The card is part of the pane.** It sits between the header and the graph or list, so one tree, one width rule and one focus ring cover it.
- **`$.model.fork`, not `$.model.complete`.** The fork asks over the session's own transcript as the main thread last sent it, with the same model and system prompt, so the prompt cache serves most of it and the answer comes from what Claude actually had. It is tool-less and never appended to the conversation.
- **A fork cannot be cancelled.** The API takes no abort signal, so instead of pretending to abort, the mod drops an answer that arrives for a selection the person has left (F11-R4). Closing the pane keeps the answer for when it opens again.
- **Split, then substitute.** Splitting the command after substituting would turn a path with a space into two arguments, and a crafted file name into extra flags. Splitting the template first keeps each value inside its own argument.
- **Absolute path to the editor.** The editor's working directory may differ from the session's; the absolute path is unambiguous.

## Testing decisions

- **Seam:** the engine test kit. The test's own hooks beneath answer and count `prompt.fill`, `prompt.submit`, `model.fork` (a pending promise on the mocked clock for F11-AC6 and AC8), `process.run` and `ui.toast`. Keys are pressed on a mounted pane, in a loop over `terminal` and `desktop`.
- F11-AC4's static half is a source scan in `check-calls.mjs` (NFR-S6); its dynamic half replays the reference session.

## Mods API used

| Need | Event or method |
| --- | --- |
| Mention | `$.prompt.fill({ text, mode: 'insert' })` |
| Ask why | `$.model.fork({ prompt })` → `{ isAnswered: true, text, usage }` or `{ isAnswered: false, reason, status? }` |
| Open | `$.process.run(argv, { timeoutMs })` → `{ exitCode, stderr }`; rejects when it cannot start |
| Failure notice | `$.ui.toast(text)` |
| Keys | `Button` with `hotkey` `m`, `w`, `o`, `x` |

## Data model changes

Adds the `why` key (`path`, `pending`, `text`, `failure`).

## Manual check

1. After the reference session's turn 1, select `src/auth/login.ts`.
2. The card lists `src/api/users.ts (never opened)` under "Imported by".
3. Press `m`: the prompt box holds ` @src/auth/login.ts ` and nothing is sent.
4. Press `w`: a side answer appears, and the conversation shows no new turn.
5. Press `o`: the file opens in your editor at the changed line.
6. Set `editorCommand` to a program that does not exist and press `o`: a toast explains.

## Out of scope

- Terminal editors (`vim`, `nano`) as the editor command: they would need the terminal Claude Code is drawing in.
- Paths with spaces in the `@` mention; Claude Code's own completion is the better tool for those.
- Asking why about a decision; its `because` is the answer.

## Open questions

None.

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Checked against the 2.1.296 types. "Aborted when the pane closes" replaced by dropping late answers (a fork cannot be cancelled); added the failure wording per `reason`, the exact prompt, `x` to close, and argument splitting before substitution (the earlier order split paths with spaces).
