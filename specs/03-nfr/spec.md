# 03 Non-functional requirements

| Status | Owner | Checked against |
| --- | --- | --- |
| Approved | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 |

CC Graph must be invisible in cost. It adds no noticeable latency to tool calls or streaming, sends nothing off the machine, asks the engine for very little, and never breaks a session when it fails.

"From" names the milestone in which a requirement starts to be enforced in CI. Every requirement is verified before v1.0.

## Performance

| ID | Requirement | Checked by | From |
| --- | --- | --- | --- |
| NFR-P1 | A `tool.call` hook's own time is under 10 ms median and under 50 ms at p99, with 60 nodes in the graph | Benchmark: 200 calls from the reference session through `$.tool.call` with an instant tool beneath, against a baseline of the same call under a tool the plugin's matcher skips (a test cannot unload the plugin) | v0.1 |
| NFR-P2 | The `turn.step` hook adds under 1 ms per chunk, and never reorders, drops or holds back a chunk | F05-AC1 plus a timing test over a 2,000-chunk step | v0.4 |
| NFR-P3 | A `ui.render` of 60 nodes and 120 edges builds its tree in under 50 ms, on each surface | Benchmark through `$.ui.mount` | v0.2 |
| NFR-P4 | Layout and `git` never run inside `ui.render` or on a hook's return path. Redraws come from `$.state` writes and the engine's own redraw rate | Event test: a `tool.call` that changes a file returns before any `process.run` is raised; code review | v0.2 |
| NFR-P5 | All of CC Graph's `$.state` stays under 1 MB of JSON after the 500-call fixture | Size test | v0.1 |
| NFR-P6 | `git` runs one process at a time, at most once per changed path per turn for `grep`, once per turn, per `Bash` call that is not read-only, and per burst of Claude's own changes for `status` (each with one `rev-parse HEAD`, and one `diff` when `HEAD` moved), each with a 5 second timeout | F07 tests counting `process.run` | v0.3 |

## Privacy and security

CC Graph handles the most sensitive things in a session: file contents in tool results, and Claude's thinking. It keeps them in memory, on the machine, for the length of the conversation.

| ID | Requirement | Checked by | From |
| --- | --- | --- | --- |
| NFR-S1 | The hooks module calls only these `$` methods: `$.agent.list`, `$.clock.after`, `$.clock.now`, `$.command.register`, `$.model.fork`, `$.process.run`, `$.prompt.fill`, `$.session.surfaces`, `$.session.usage`, `$.state.get`, `$.state.set`, `$.tool.register`, `$.ui.blit`, `$.ui.open`, `$.ui.resolve`, `$.ui.toast`. In particular no `$.http`, `$.store`, `$.fs`, `$.env` or `$.session.send` | `check-calls.mjs`: the `calls:` line of `claude plugin validate --json` is a subset of the allowlist | v0.1 |
| NFR-S2 | Thinking text and file contents are never written anywhere but `$.state`, and thinking is cut to 400 characters a note | NFR-S1 plus F05-AC3 | v0.4 |
| NFR-S3 | No telemetry: no hook on `telemetry.*`, and no data leaves through any `$` call | `check-calls.mjs` reads the `hooks:` line | v0.1 |
| NFR-S4 | `$.process.run` runs only `git` and the person's configured editor command, always as an argument list, never through a shell. Values substituted into the editor command never split into extra arguments | Source scan for `process.run` call sites; F14-AC6 | v0.3 |
| NFR-S5 | `git` runs read-only: `rev-parse`, `status`, `grep`, `diff --name-status`, with `GIT_OPTIONAL_LOCKS=0` so it never takes the index lock. (Claude Code also runs `git` from mods with repository hooks off.) | Source scan of the `git` argument lists | v0.3 |
| NFR-S6 | `$.model.fork` is called only from the "Ask why" press handler; no other model call exists. `$.session.usage` is never called with `breakdown: 'full'`, which sends one token-count request per file | Source scan; F11-AC4; F04-AC3 | v0.1 |

### Threat model

- **What CC Graph could leak.** Paths, search hits, excerpts of thinking. NFR-S1 leaves it no channel off the machine and no disk to write to.
- **Other installed mods.** Any plugin can read another's `$.state` values. That exposes nothing new: any mod can already hook `tool.call` and `turn.step` and see the same data first-hand.
- **Commands it runs.** Only read-only `git` and the editor command the person configured, by argument list (NFR-S4, NFR-S5). File paths come from tool results and could be crafted by a repository; substituting a path never creates a new argument, and `git` receives paths after `--`.
- **What people can verify.** `claude plugin validate` on a clone prints every event CC Graph hooks and every `$` method it calls, before installing. The README shows that list.

## Robustness

| ID | Requirement | Checked by | From |
| --- | --- | --- | --- |
| NFR-R1 | Every gating hook has a pass-through `.catch`, so a failure in CC Graph never changes what Claude Code does | `check-calls.mjs`: every `gatingHooks` entry of `validate --json` has `hasCatch: true` | v0.1 |
| NFR-R2 | A failing non-gating hook shows nothing beyond the debug log, and the next event works normally | Fault-injection event test | v0.1 |
| NFR-R3 | CC Graph works without `git`, outside a repository and in an empty folder | F07-AC4 | v0.3 |
| NFR-R4 | CC Graph coexists with other pane mods: its own pane id, matchers that never select another plugin's pane | UI test with a second inline plugin drawing its own pane | v0.1 |
| NFR-R5 | Parallel tool calls never lose a write | Event test: 10 concurrent `Read` calls give 10 nodes | v0.1 |
| NFR-R6 | A hot reload keeps the graph, and the module rebuilds its own variables at the `session.start` that follows | Event test raising `session.start` twice | v0.1 |

## Compatibility

| ID | Requirement | Checked by | From |
| --- | --- | --- | --- |
| NFR-C1 | Works on Claude Code v2.1.287 or later in the terminal and v2.1.286 or later in the desktop app. CI runs the pinned tested version and the latest | CI matrix | v0.1 |
| NFR-C2 | Draws the graph where the surface's element table has `Raster` (terminal) or `Svg` (desktop), and the list everywhere else. Surfaces that draw no mod output today (the VS Code chat panel, remote surfaces) still run every hook without error | UI tests looping over `terminal`, `desktop`, `vscode`, `mobile` | v0.1 |
| NFR-C3 | In sessions where nothing draws (`claude -p`, the Agent SDK), hooks run without error and `/graph` answers with a short text summary instead of a pane | Event test with no surface attached | v0.1 |
| NFR-C4 | Paths behave the same on macOS, Linux and Windows (I4) | Unit tests over path fixtures from each platform | v0.1 |

## Accessibility

| ID | Requirement | Checked by | From |
| --- | --- | --- | --- |
| NFR-A1 | Color never carries meaning alone: a glyph shape and a badge word carry every state and change | UI review checklist; UI test reading glyphs and badges | v0.1 |
| NFR-A2 | Every action has a key, listed in the key map of F08. Every key in the map is pressed by a UI test | UI tests | v0.1 |
| NFR-A3 | The list view carries every fact the graph shows, so the graph is never the only way to learn something | UI test comparing graph facts with list rows on the reference session | v0.2 |
| NFR-A4 | The desktop `Svg` carries an `alt` that summarizes the graph: counts by state, changes and blind spots | UI test | v0.5 |

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. NFR-S1 became an allowlist that `validate --json` can check; added NFR-S6 (model and usage calls), the threat model, NFR-R5 (parallel writes), NFR-R6 (hot reload), NFR-C3 (non-drawing hosts), NFR-C4 (paths), NFR-A3 and NFR-A4, and the "From" milestone for each.
- 2026-10-11 Approved by the owner.
- 2026-10-13 NFR-P1: the benchmark's baseline is the same call under a tool the plugin's matcher skips, since a test cannot unload the plugin. Approved by the owner.
- 2026-10-13 NFR-P1 median 5 → 10 ms, NFR-P3 16 → 50 ms: the first CI runs on GitHub's shared runners measured a 5 ms median and 18 to 26 ms renders. Approved by the owner.
- 2026-10-15 Back to Review with F07: NFR-S5 adds `diff --name-status`, which F07-R14 needs to see commits and merges. NFR-P6 counts `status` per writing `Bash` call (F07-R18 skips read-only ones) and per burst of Claude's own changes (F07-R13), each with a `rev-parse HEAD`. Approved by the owner.
