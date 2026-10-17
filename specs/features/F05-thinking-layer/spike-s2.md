# Spike S2: which models and settings stream thinking text to a mod (F05-Q1)

Claude Code 2.1.302, 2026-10-17. Probe mod `fixtures/sessions/thinking-probe` (it logs `session.start`, `turn.start` and every `turn.step`: input, each chunk as it streamed, result). Prompt `fixtures/sessions/thinking-turn1.txt`: two `Read`s in one response, one Explore `Agent`, then a one-sentence answer. Each run in a fresh copy of `fixtures/sample-app`, with `--setting-sources project`.

## Results

"Thinking" counts `{ kind: 'thinking' }` chunks per main-loop step, "with text" those whose `text` is not empty.

| Model | Effort | Mode | Display | Steps with thinking | Chunks with text |
| --- | --- | --- | --- | --- | --- |
| Opus 5.5 | medium | `-p` | default (omitted) | 1 of 4 | 0 of 1 |
| Opus 5.5 | medium | `-p` | `--thinking-display summarized` | 1 of 4 | 15 of 15 |
| Opus 5.5 | high | `-p --output-format stream-json --verbose` | default (the API's) | 1 of 3 | 0 of 1 |
| Opus 5.5 | high | same | summarized | 1 of 4 | 12 of 12 |
| Sonnet 5.5 | high | same | default / summarized | 0 of 4 | none to count |
| Sonnet 5.5 | max, "ultrathink" | same | default | 4 of 4 | 0 of 19 |
| Sonnet 5.5 | max, "ultrathink" | same | summarized | 4 of 4 | 163 of 163 |
| Haiku 5.5 | high | same | default | 3 of 3 | 0 of 5 |
| Haiku 5.5 | high | same | summarized | 3 of 3 | 80 of 80 |
| Haiku 5.5 | high | interactive | default | 3 of 4 | 0 of 8 |
| Haiku 5.5 | high | interactive | `showThinkingSummaries: true` | 4 of 4 | 86 of 86 |

## Answers

- **F05-Q1: thinking text reaches a mod only when Claude Code asks the API for summaries.** That is `"showThinkingSummaries": true` in settings, or `--thinking-display summarized` on the command line. Without it, every model streams its thinking blocks as `thinking` chunks with empty `text`: interactive and `-p` alike. This is the same for Opus, Sonnet and Haiku 5.5. A hook cannot change it: `turn.step` lets a hook rewrite `model` and `effort`, not the display.
- **Why.** The 2.1.302 binary picks the display per session: an explicit `--thinking-display` wins; interactive sessions ask for `summarized` only when `showThinkingSummaries` is true and otherwise leave it to the API; `-p` with text or plain JSON output asks for `omitted`. With display left to the API, the 5.5 models answered with empty thinking in every run above.
- **Within one setting, steps are all-or-nothing.** No step mixed chunks with and without text. The mix seen in local transcripts (Q1's earlier evidence) is across sessions or setting changes, not within a step.
- **Adaptive thinking skips steps.** With summaries on, Opus 5.5 at medium and high effort thought only in the step that answered, not in the steps that called tools: the one note such a turn gives names no files. Sonnet 5.5 at high effort did not think at all on this prompt. Haiku 5.5 thought in every step. A step without `thinking` chunks is not "hidden" (F05-R6 already says so).
- **Subagents.** With summaries on, a subagent's steps stream thinking text too (`e.agentId` set). F05-R7 drops them.
- **One block per step.** Every step that thought had one thinking block, `index` 0, before its text and tool blocks.

## Found on the way: `turn.start` fires for subagents

Every run logged a `turn.start` with `agentId` (the Explore agent's) between the main loop's. The F15 recording on 2.1.296 (`fixtures/sessions/README.md`, `subagents.ts`) had none, and the 2.1.301 types say a subagent's start is heard by every hook but the ones its spawn was nested in. The mod's `turn.start` hook does not check `e.agentId`, so on 2.1.301 and later `turn` counts subagent turns (02 Data model: "main-loop turns started"), and a subagent's start also clears the turn's searched paths and shell commands and runs the between-turns `git` check mid-turn. A throwaway engine-kit test confirmed it: one main turn and one subagent `turn.start` leave `turn` at 2.

## Fixture

`fixtures/sessions/thinking.ts` holds the two interactive Haiku runs, recorded again in `/private/tmp/claude-501/rec-thinking/sample-app` so no personal path is in the streamed tool input: `shown` (`showThinkingSummaries: true`) and `hidden` (default). How to record again: `fixtures/sessions/README.md`.

## Untried

- Models before the 5.5 family, and `--thinking-display highlights` (the help says the API accepts it only from sessions Anthropic hosts).
- A session whose display changes midway (`/config`, or the SDK's `set_max_thinking_tokens` with `thinking_display`).
- The desktop app.
