# Roadmap

CC Graph ships as small installable releases. Each milestone has a theme, the features it completes, and an exit gate that must pass in CI before work on the next one starts. There are no dates: a milestone is done when its gate is green.

The specs behind every line are in [`specs/`](specs/README.md). A feature moves through Draft, Review, Approved, Implemented and Verified as described there.

## At a glance

| Milestone | Theme | Features | Status |
| --- | --- | --- | --- |
| [M0](#m0-foundations) | Foundations | none | In progress |
| [v0.1](#v01-what-claude-knows) | What Claude knows | F01, F02, F03, F04, F08, F14 (`maxNodes`), F15 | Planned |
| [v0.2](#v02-the-graph) | The graph | F06, F09 | Planned |
| [v0.3](#v03-blind-spots) | Blind spots | F07, F14 (`blindSpots`) | Planned |
| [v0.4](#v04-why-it-did-that) | Why it did that | F05, F11, F14 (`captureThinking`, `editorCommand`) | Planned |
| [v0.5](#v05-desktop-graph-and-pointer) | Desktop graph and pointer | F10 | Planned |
| [v0.6](#v06-decisions-and-timeline) | Decisions and timeline | F12, F13, F14 (`decisions`) | Planned |
| [v1.0](#v10-hardening-and-listing) | Hardening and listing | none | Planned |

Why this order: v0.1 answers the first goal in a list that works on every surface, and is already worth installing. The graph comes next because blind spots need edges. Thinking and actions follow the questions they answer. The desktop pointer waits for its spike, and the opt-in feature that changes what Claude sees comes last.

## M0 Foundations

Set up everything the first feature needs, and answer the questions that could change the architecture.

- [x] Spec set drafted and checked against the Claude Code 2.1.296 types
- [ ] Owner approves specs 00 to 04 and the v0.1 feature specs
- [ ] `.claude-plugin/plugin.json` (`cc-graph`, `types`), `marketplace.json`, `hooks/hooks.json`, an empty `hooks/register.tsx`, `types/index.d.ts` with the [state contract](specs/02-data-model/spec.md#state-contract), and `tsconfig.json` from the types header
- [ ] Load once with `claude --plugin-dir .` so Claude Code writes `.claude-plugin/types/`, then commit them
- [ ] `fixtures/sample-app` as specified in [04 Reference session](specs/04-reference-session/spec.md), and real tool output captured into `fixtures/output/`
- [ ] `scripts/trace.mjs`, `scripts/check-calls.mjs` and the CI workflow; a first green run on an empty suite
- [ ] `CHANGELOG.md`
- [ ] Spikes S0 and S1 recorded next to their specs

**Exit gate:** CI green on the pinned version and `latest`; S0 and S1 answered.

## v0.1 What Claude knows

A list view that says, for every file, what Claude saw of it, what is in context, what compaction took, and which memory files are in force. Subagent reads are kept out of the meter from day one.

**Exit gate:**

- Every acceptance criterion of F01, F02, F03, F04, F08, F14 (`maxNodes`) and F15 passes.
- Reference-session checkpoints RS-1 and RS-4 pass.
- NFR-P1, P5, S1, S3, S6, R1, R2, R4, R5, R6, C1, C2, C3, C4, A1 and A2 pass.
- The manual checks are done in a terminal and in the desktop app.
- REL-Q1 checked again; `cc-graph--v0.1.0` tagged; the README has the install line.

## v0.2 The graph

Import edges from text Claude already saw, and the terminal graph that draws them, laid out by folder and stable as it grows.

**Exit gate:** every criterion of F06 and F09; NFR-P3, P4 and A3; the reference session's first turn draws in the terminal with its import edges and ghosts.

## v0.3 Blind spots

Files that import a change but were never opened, and files a shell command changed behind Claude's back, named while the turn is still running.

**Exit gate:** every criterion of F07 and F14 (`blindSpots`); RS-2 and RS-3; NFR-P6, S4, S5 and R3; spike S4 decided and F07-Q2 closed.

## v0.4 Why it did that

Thinking excerpts linked to the files they led to, and the card with its three actions: mention, ask why, open.

**Exit gate:** every criterion of F05, F11 and F14 (`captureThinking`, `editorCommand`); NFR-P2 and S2; spike S2 recorded and the README says which models show thinking.

## v0.5 Desktop graph and pointer

The vector graph in the desktop app, and pointer selection on the graph on the desktop and in the fullscreen terminal, if the overlay proves out.

**Exit gate:** every criterion of F10; NFR-A4; spike S3 decided (F10-R5 kept or struck).

## v0.6 Decisions and timeline

Claude's own decisions drawn next to the files they shaped (opt-in), and a timeline that replays the graph turn by turn.

**Exit gate:** every criterion of F12, F13 and F14 (`decisions`); spike S5 decided; RS-5 passes with `decisions` on.

## v1.0 Hardening and listing

- Every NFR verified on the pinned version; every spec Verified.
- README with a screenshot per surface, the install line, the supported Claude Code versions, the privacy section, and the `claude plugin validate` output for the release.
- REL-Q2 answered; the plugin submitted to Anthropic's community catalog once `claude plugin validate .` reports no error and no warning beyond the accepted root `CLAUDE.md` one.

## Spikes

A spike is a throwaway probe mod that answers one question. Its notes go next to the spec it serves (for example `specs/features/F03-context-layer/spike-s1.md`); its code is never merged.

| ID | Question | Answers | When | Blocks |
| --- | --- | --- | --- | --- |
| S0 | May a `$.clock.after` callback call `$.process.run` and `$.state` after the hook that scheduled it returned? | ARCH-Q1 | M0 | The off-path queue (F07, F09) |
| S1 | What do `file` and `edited_text_file` attachments say, and do they name paths in a stable form? | F03-Q1, F07-Q1 | M0 | F03 approval |
| S2 | Which models and settings stream thinking text to a mod? | F05-Q1 | Before v0.4 | F05 approval |
| S3 | Does a transparent `Client` over the graph receive pointer events? | F10-Q1 | Start of v0.5 | F10-R5 |
| S4 | Can the `Bash` result's per-command change list replace the `git status` baseline? | F07-Q2 | During v0.3 | F07 approval |
| S5 | Does a plugin's own tool raise a permission prompt? | F12-Q1 | Start of v0.6 | F12 approval |

F14-Q1 (out-of-range numbers) needs no spike: F14-AC5 answers it in the red phase of v0.1.

## Later

Ideas that fit the product but are not committed. Each needs its own spec first.

- A graph filtered to the agent whose transcript is on screen (the pane's `view.agentId`).
- Files read through the shell (`cat`, `head`, `sed -n`) tracked like reads.
- A sharper terminal graph with `Image` where the terminal speaks the kitty graphics protocol.
- A `claude plugin eval` suite that measures how well Claude logs decisions (F12).
- Import edges for more languages.

## Not planned

These are [non-goals](specs/00-product/spec.md#non-goals): code intelligence, network access of any kind, changing what Claude sees beyond the opt-in F12, exact token counts, and history across sessions.

## Releases and compatibility

- Versions follow semver. Each milestone is a minor release (`0.1.0`, `0.2.0`, …); fixes are patches. Before 1.0 a release may change behaviour, and the CHANGELOG says how.
- Every release bumps `version` in `plugin.json`, adds a CHANGELOG entry, and is tagged with `claude plugin tag --push` (`cc-graph--v0.1.0`).
- Every release names the Claude Code versions it was tested on. CI runs the pinned version and `latest`; moving the pin updates the committed types and every spec header in one change.
