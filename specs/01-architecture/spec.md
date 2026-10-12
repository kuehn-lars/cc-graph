# 01 Architecture

| Status | Owner | Checked against |
| --- | --- | --- |
| Approved | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 |

One module talks to Claude Code. Everything else is a pure function. The wiring module turns events into actions, pure reducers turn actions into new state, `$.state` holds it, and pure renderers turn state into an element tree for the surface that asked. Work that costs time (layout, `git`) is queued by the hooks and run off their return path.

## Context

```text
                        ┌──────────────────────────────── Claude Code (engine) ─────────────────────────────┐
  person ── /graph ───▶ │  events: tool.call, prompt.mention, session.compact, session.measure, turn.step,  │
  keys, clicks          │          turn.start, prompt.attachment, classic.SessionStart, ui.render, ui.press  │
                        │                                   │                       ▲                         │
                        │                                   ▼                       │ element trees           │
                        │                       ┌──────── cc-graph ────────┐        │                         │
                        │                       │ wiring ─▶ model ─▶ $.state ─▶ render                        │
                        │                       │    │                     │                                  │
                        │                       │    └─▶ work queue ─▶ parse, layout                          │
                        │                       └──────────┬───────────────┘                                  │
                        └──────────────────────────────────┼─────────────────────────────────────────────────┘
                                                           │ $.process.run (argv, no shell)
                                                           ▼
                                             git (read-only)   the person's editor
```

Nothing else is reached: no network, no file reads or writes, no persistent store (NFR-S1).

## Data flow

```text
write path (inside a hook, constant work)
  event ──▶ wiring: await next(e) ──▶ action ──▶ model reducer (pure) ──▶ update($.state 'cc-graph'.graph)
                                         │                                        │
                                         └──▶ enqueue: layout, git status, git grep   the write redraws readers
                                                                                   ▼
off the return path (coalesced, one at a time)                         ui.render on Pane 'cc-graph'
  $.clock.after ──▶ $.process.run(git …) ──▶ parse (pure) ──▶ action ──▶ update        │
                ──▶ layout (pure, seeded) ──────────────────────────────▶ update(layout) │
                                                                                   ▼
read path (inside ui.render, reads only)                         render (pure): state + the element
  $.ui.resolve(e) ──▶ element table ──────────────────────────────▶ table from $.ui.resolve(e) ──▶ tree

key presses (ui.press) and Client posts (ui.message) loop back into the wiring and write only UI keys.
```

## Repository layout

```text
cc-graph/
├── .claude-plugin/
│   ├── plugin.json          # name, version, userConfig, "types": "./types/index.d.ts"
│   ├── marketplace.json     # the repository is its own marketplace
│   └── types/               # written by Claude Code at load; committed, pinned to the tested version
├── hooks/
│   ├── hooks.json           # { "modules": ["./register.tsx"] }
│   ├── register.tsx         # wiring: every on(...) and every $ call
│   ├── model/               # pure reducers: (state, action) → state
│   ├── parse/               # pure parsers: search output, imports, git output
│   ├── layout/              # pure, seeded, incremental force layout
│   └── render/              # pure tree builders: list, raster, svg, card
├── types/index.d.ts         # the $.state contract (02 Data model)
├── tests/                   # events/, ui/, scenarios/, unit/, bench/
├── fixtures/
│   ├── sample-app/          # the reference project (04)
│   ├── sessions/            # scripted event sequences and their golden graphs
│   └── output/              # real rg, grep and git output captured in sample-app
├── scripts/
│   ├── trace.mjs            # criterion ↔ test check
│   └── check-calls.mjs      # static privacy and robustness checks
├── specs/                   # one folder per spec
├── .github/workflows/ci.yml
├── CLAUDE.md                # instructions for Claude Code working on this repository
└── ROADMAP.md, CHANGELOG.md, README.md, LICENSE
```

The repository root is the plugin root. `claude plugin validate` warns about the root `CLAUDE.md` because a plugin does not load it as context, which is intended here: it is for working on the repository, not for people who install the mod. That one warning is accepted; CI fails on every other error and warning (see [CI](#ci)).

## Module rules

| Module | May | Must not |
| --- | --- | --- |
| Wiring (`register.tsx`) | Call `on(...)` and every `$` method; read and write `$.state`; enqueue off-path work | Hold logic worth testing on its own |
| `model` | Reduce `(state, action) → state` | Touch `$`, clocks, randomness or I/O |
| `parse` | Turn text (search output, source text, `git` output) into data | Touch `$` |
| `layout` | Place nodes; same input and seed give the same output | Touch `$`; use unseeded randomness |
| `render` | Build a tree from state plus the element table `$.ui.resolve(e)` returned | Call `$`. The table is passed in, never `$` |

The split is enforced by the platform, not only by taste: `claude plugin validate` refuses passing `$` to a function imported from another file, so a module outside the wiring cannot reach the engine.

## Decisions

| ID | Decision | Why | Consequence |
| --- | --- | --- | --- |
| D1 | Functional core, imperative shell: one wiring module makes every `$` call | `validate` already forbids passing `$` across files; pure code is cheap to test and reason about | `model`, `parse`, `layout`, `render` are plain TypeScript with no engine types beyond data |
| D2 | Observation only | A visualization must never change the session it shows (P1) | Every hook awaits `next(e)`, updates state afterwards, and returns that result object. Gating hooks end with `.catch(($, e, next) => next(e))`. F12 is the one opt-in exception |
| D3 | One `$.state` key per concern; the graph is one key, written with `update` | `update` reads, applies and writes with `ifVersion`, retrying on a miss, so parallel tool calls never lose a write, and invariants hold at every version a reader can see | A key press writes only a UI key and never rewrites the graph. Positions live in their own key, so a layout pass never rewrites the graph |
| D4 | The renderer follows the element table, not the surface name | Tables differ per surface and grow between releases | `Raster` in the table: terminal graph (F09). Else `Svg`: vector graph (F10). Else the list (F08). The list always carries every fact |
| D5 | Slow work runs off the hook's return path | A hook awaiting `git` or a layout delays the tool result Claude is waiting for (P4) | Hooks only enqueue. One coalesced `$.clock.after` callback drains the queue, one `git` process at a time, and writes results through `update` |
| D6 | No file reads | Reading files would cost the person privacy and the session time, and would show Claude-adjacent knowledge Claude doesn't have | Edges come from text Claude's own tool results carried (F06); the reverse direction comes from `git grep` (F07). The mod never calls `$.fs` |
| D7 | Session-scoped state | The pane describes one conversation; persisting file data or thinking adds risk for no gain | Nothing goes to `$.store` or disk. The graph resets on `/clear`, `/resume` and `/branch` (F03) |
| D8 | Test through the engine's test kit; pure-function tests only for `parse` and `layout` | The kit runs the real hooks under the real engine with no session, so one seam covers wiring, reducers and renderers, and refactors don't break tests | No test imports `model` or `render`. Parsers and layout get direct tests because their input space is large |
| D9 | Pin the Mods API version | The API is early access | The generated types are committed; CI runs the pinned version and `latest`; moving up updates both together |

## Mods API surface

Every row was checked against the Claude Code 2.1.296 types on 2026-10-11. The committed `.claude-plugin/types/claude-code/index.d.ts` is the authority; when it disagrees with a spec, the spec gets an open question.

| Need | Event or method | Spec |
| --- | --- | --- |
| Session working directory | `session.start`: `next(e)` resolves `{ cwd }`. Fires at load and again after each hot reload, never on `/clear` | 02 (I4) |
| Main-loop turn numbers | `turn.start` (`turnId`); a subagent's run raises none | 02 |
| `/graph` | `$.command.register({ name: 'graph', description, argumentHint, immediate: true })` in `session.start`; a `command.run` hook matched to `{ command: 'graph' }` answers `{ text }` itself | F08 |
| Reads, edits, writes, notebook edits | `tool.call` on `Read`, `Edit`, `Write`, `NotebookEdit`, after `await next(e)`. `result` is typed per tool: `Read` is one of `text`, `image`, `notebook`, `pdf`, `parts`, `file_unchanged`; `Edit` and `Write` carry `structuredPatch` and `staged`; `Write` carries `type: 'create' \| 'update'` | F01 |
| Files the person `@`-mentions | `prompt.mention` (`path`, `offset`, `limit`), after `next(e)`: `{ type: 'file' \| 'already_read_file' \| 'pdf_reference' \| null }`. No `tool.call` is raised for these reads | F01 |
| Search hits | `tool.call` on `Bash`: `e.command`, `result.stdout`, `result.interrupted`. This build registers no `Grep` tool | F02 |
| Compaction | `session.compact` after `next(e)`: input `trigger` (`manual`, `auto`, `plugin`, `precompute`) and `agentId`; result `{ messages, tokensBefore?, tokensAfter? }` or `{ skip }`. Kept messages carry `toolUses[].tool_use_id` | F03 |
| Files re-attached after compaction | `prompt.attachment` with `type: 'file'` (text only, no structured detail) | F03 |
| Window fill | `session.measure` whose `changed` holds `context`: `context.tokens?`, `context.window`, `context.percent?` | F03 |
| Reset | `classic.SessionStart` with `source` `clear`, `resume` or `fork` (not `startup`, not `compact`) | F03 |
| Memory files | `$.session.usage({ breakdown: 'summary' })` → `context.breakdown.memoryFiles` (`path`, `type`, `tokens`); `classic.InstructionsLoaded` (`file_path`, `memory_type`, `load_reason`) | F04 |
| Thinking | `turn.step` as an async generator: chunks `{ kind: 'thinking', index, text }`; the step result's `toolUses[].input` | F05 |
| Outside edits Claude was shown | `prompt.attachment` with `type: 'edited_text_file'` | F07 |
| Repository root, shell changes, reverse imports | `$.process.run(['git', …], { cwd, timeoutMs, env })` → `{ exitCode, stdout, stderr }`; rejects when `git` cannot start | F07 |
| Pane | `$.ui.open({ id: 'cc-graph', title, focus: true, closeOnEscape: true, columns })` → `{ isPlaced }` or `{ isPlaced: false, reason }`; `ui.render` on `{ component: 'Pane', requestId: 'cc-graph' }` with props `bodyColumns`, `scroll.bodyRows`, `placement`, `isFocused` | F08 |
| Surfaces and elements | `$.ui.resolve(e)` (the table for `e.surface`); `$.session.surfaces()` | F08 |
| Keys and rows | `Button` with `hotkey` (one digit or lowercase letter), `plain`, `key`; presses raise `ui.press` | F08 |
| Terminal graph | `Raster` (`columns` 1–512, `rows` 1–256, `cells` packed base64); `$.ui.blit` repaints it without a render | F09 |
| Desktop graph | `Svg` (`source` at most 131,072 characters, required `alt`, `isInteractive`) | F10 |
| Pointer on the graph | `Client` module (`onPointer`, `post`) → `ui.message`; `ui.fault` when it fails | F10 |
| `@` mention action | `$.prompt.fill({ text, mode: 'insert' })` | F11 |
| Ask why | `$.model.fork({ prompt })` → `{ isAnswered: true, text, usage }` or `{ isAnswered: false, reason }` (`api-error`, `empty-reply`, `aborted`, `nothing-to-fork`) | F11 |
| Open in editor | `$.process.run(argv)` with the configured editor command | F11 |
| Notices | `$.ui.toast(text)` | F07, F08, F11 |
| Decision tool | `$.tool.register({ name: 'log_decision', description, inputSchema, isDeferred: false })`, listed as `mcp__cc-graph__log_decision`, answered by a `tool.call` hook on that name | F12 |
| Decision instruction | `prompt.compose`: append one `{ id, text, scope: 'session' }` section to what `next(e)` resolved | F12 |
| Subagents | `e.agentId` on `tool.call`, `turn.step`, `session.compact`; `$.agent.list()` → `{ id, type, description }` | F15 |
| Settings | `userConfig` in `plugin.json`, read as `register(on, options)`; `pluginConfigs` in settings for `--plugin-dir` | F14 |
| State | `$.state` through `atom`, `read`, `update` from `'claude-code'`; the contract in `types/index.d.ts` | 02 |
| Off-path work | `$.clock.after` | D5 |

## Hook rules

- **Pass-through.** Every hook returns the object `next(e)` resolved to. State changes only after `await next(e)`, so a denied, failed, skipped or staged call changes nothing.
- **Catch.** Every hook at a gating site (`tool.call`, `prompt.mention`, `session.compact`, and any other `validate` lists under `gatingHooks`) is registered with `.catch(($, e, next) => next(e))`. A failure in CC Graph then never changes what Claude Code does (NFR-R1).
- **Matchers.** Hooks match as narrowly as the event allows (`{ tool: 'Read' }`, `{ component: 'Pane', requestId: 'cc-graph' }`), so CC Graph never runs for events it ignores and never draws another plugin's pane (NFR-R4).
- **Drawing reads only.** `ui.render` hooks read `$.state` and build a tree. They never write, never run layout or `git`, and never await anything but state reads (I6, NFR-P4).
- **Constant work.** A hook does work bounded by its own input (one tool result, one chunk) plus one `update`. Anything that scales with the repository is enqueued (D5).
- **Concurrency.** Writes go through `update`, never a `get` then `set`, because Claude can run tools in parallel.

## Off-path work

The wiring keeps one queue, drained by a single `$.clock.after` callback that is scheduled when work arrives and none is pending.

| Work | Enqueued by | Coalescing | Writes |
| --- | --- | --- | --- |
| Layout pass | Any write that adds nodes or edges | One pending pass at most | `layout` |
| `git status` baseline | `session.start`, main-loop `turn.start`, each finished `Bash` call | One per trigger, in order | `graph` (F07) |
| `git grep` for importers | A changed path | Once per path per turn | `graph` (F07) |

Jobs run one at a time, so at most one `git` process runs at once. A job that fails is dropped and logged to the debug log; the queue goes on. Whether a timer callback may call `$.process.run` and `$.state` after the hook that scheduled it returned is spike S0 (ARCH-Q1), answered before any feature depends on it.

## Testing strategy

All automated tests run under `claude plugin test`, which needs no session, sign-in or network, so CI runs every acceptance criterion on every push.

### Seams

The **primary seam** is the plugin as the engine loads it, driven through `claude-code/testing`:

- The test's `$` raises events exactly as the engine does: `$.tool.call({ tool: 'Read', file_path })`, `$.session.compact({ trigger: 'manual', messages })`, `$.turn.step(e)`, `$.prompt.mention(e)`, `$.session.measure(e)`, `$.classic.SessionStart({ source: 'clear' })`.
- The test's own `on(...)` hooks sit beneath every plugin and stand in for the engine: they answer tool results, compaction results, `process.run` (`git`), `model.fork`, `prompt.fill` and `ui.toast`, and count calls.
- Assertions read `$.state.get({ plugin: 'cc-graph', key })`, and the drawing through `$.ui.mount({ plugin: 'cc-graph', surface, component: 'Pane', requestId: 'cc-graph', props })`, acted on with `press` and read with `find`.

The **secondary seam** is the pure functions of `parse` and `layout`, imported directly, used only where the input space is large: search output formats, import specifiers, `git` porcelain, layout determinism and timing. Reducers and renderers are tested only through the primary seam, so they can be refactored freely.

### Layers

| Layer | Proves | Seam | Where |
| --- | --- | --- | --- |
| Event tests | Hooks turn events into the right state and pass results through untouched | Primary | `tests/events/` |
| UI tests | The pane draws, fits its width, and reacts to keys, on each surface in a loop over `['terminal', 'desktop'] as const` and, for the list, `vscode` and `mobile` | Primary | `tests/ui/` |
| Scenario replay | The reference session ends in the expected graph, checkpoint by checkpoint (RS-1 to RS-5) | Primary | `tests/scenarios/` |
| Unit tests | Parsers and layout across many inputs | Secondary | `tests/unit/` |
| Benchmarks | NFR-P1, NFR-P2, NFR-P3, NFR-P5 | Both | `tests/bench/`, pinned CI job only |
| Static checks | NFR-S1 to NFR-S6, NFR-R1 | `claude plugin validate --json` plus a source scan | `scripts/check-calls.mjs` |
| Manual checks | It looks and feels right in a real terminal and the desktop app | A real session in `fixtures/sample-app` | Each spec's manual check |

### Rules

- Each acceptance criterion has at least one test whose name starts with its ID.
- Time comes from `mock.clock(on)` and layout from a fixed seed. No real time and no unseeded randomness outside benchmarks.
- Tool output in fixtures is captured from real runs in `fixtures/sample-app`, never typed by hand.
- A bug fix starts with a failing test named after the criterion it broke. If no criterion covers it, the spec gets one first.

### Prior art

- Claude Code's built-in `/diff` mod (source in `anthropics/claude-code`, folder `mods/diff`): a pane with buttons bound to keys, its own scrolling, and tests in the same kit.
- The sample mods in `anthropics/claude-code-playground` (`claude-code/mods`): `token-weather` (a context-window drawing) and `replay-theater` (stepping through a turn's file changes).

## CI

`.github/workflows/ci.yml` runs on push and pull request, with the matrix `claude: ['2.1.296', 'latest']`:

1. Install Claude Code at the matrix version: `curl -fsSL https://claude.ai/install.sh | bash -s <version>`.
2. `npx -y -p typescript@5 tsc -p .`
3. `claude plugin test`
4. `node scripts/check-calls.mjs`
5. `node scripts/trace.mjs --check`

The `latest` job runs with `continue-on-error`. It is an early warning, not a release blocker. Moving to a new version updates the pinned version, the committed types and every spec header in one change.

`check-calls.mjs` runs `claude plugin validate --json .` and fails on any error, on any warning other than the accepted root `CLAUDE.md` one (so it is `--strict` with one known exception), when a `gatingHooks` entry has `hasCatch: false`, or when the module's `calls:` line names a `$` method outside the allowlist in [NFR-S1](../03-nfr/spec.md#privacy-and-security). It then scans the hooks source for the argument-level rules `validate` cannot see (NFR-S4 to NFR-S6).

## Release and distribution

The repository is its own marketplace from the first release. The community catalog listing comes at v1.0.

`.claude-plugin/marketplace.json`:

```json
{
  "name": "cc-graph",
  "description": "A live graph of what Claude Code knows, read and changed",
  "owner": { "name": "Lars Kühn" },
  "plugins": [
    { "name": "cc-graph", "source": "./", "category": "visualization", "tags": ["mod", "context", "graph"] }
  ]
}
```

Every release:

1. Bump `version` in `plugin.json` (semver) and add a CHANGELOG entry. Without a new version, people keep the cached copy.
2. Run the CI checks locally, then test the install from the folder: `claude plugin marketplace add ./`, `claude plugin install cc-graph@cc-graph`, a fresh session.
3. `claude plugin tag --push` creates and pushes `cc-graph--v<version>` after checking that `plugin.json` and the marketplace entry agree.

People install with `/plugin install cc-graph --marketplace kuehn-lars/cc-graph` and update with `claude plugin update cc-graph@cc-graph`.

Before the first public tag: the README carries a screenshot per surface, the install line, the supported Claude Code versions and the privacy section, and `plugin.json` carries `description`, `author`, `homepage`, `repository` and `license`. At v1.0, once `check-calls.mjs` passes, the plugin is submitted to Anthropic's community catalog. `cc-graph` is permanent after the first release; a rename changes only `displayName`.

## Open questions

- [x] **ARCH-Q1** May a `$.clock.after` callback scheduled by a hook call `$.process.run` and `$.state` (through `update`) after that hook returned, and do those writes redraw the pane? Spike S0 in M0 with a two-hook probe mod. Blocks approval (D5 depends on it). If not, `git` work moves to a `turn.complete` hook that schedules nothing and awaits within its budget, and layout runs inside the writing hook under NFR-P1's limit. Answered by spike S0 ([spike-s0.md](spike-s0.md)): yes. The callback runs `git` and writes through `update` with the scheduling hook's `$`, from `session.start`, `command.run` and `tool.call`, also under `claude -p`, and the write redraws the pane without `$.ui.invalidate`. D5 stands.

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Checked against the 2.1.296 types. Added context diagram, decisions D1 to D9, the off-path work queue, the two test seams, strict validation through `check-calls.mjs` with the root `CLAUDE.md` warning as the one accepted exception, and the corrected API surface (`session.measure`, `classic.InstructionsLoaded`, `Read` result kinds, no `Grep` tool, `command.run` answering its own command).
- 2026-10-12 CI step 2 runs `tsc` through `npx -p typescript@5`. ARCH-Q1 answered by spike S0. Approved by the owner.
