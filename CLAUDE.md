# CC Graph

A Claude Code mod (plugin `cc-graph`) that draws a live pane of what Claude read, searched, changed and still holds in context. `specs/` is the source of truth: code follows the spec, never the reverse. Start at `specs/README.md` (index, lifecycle, IDs); `ROADMAP.md` says what ships when.

## The loop, one feature at a time

1. **Spec.** The feature's `specs/features/Fxx-*/spec.md` reaches Status: Approved: every requirement checked against `.claude-plugin/types/claude-code/index.d.ts`, no open questions left. Code for a requirement waits until its spec is Approved.
2. **Red.** One test per acceptance criterion, the name starting with its ID (`test('F03-AC4 …')`). Run `claude plugin test` and see each new test fail.
3. **Green.** The smallest change in `hooks/` that passes them.
4. **Checks.** The check command below passes.
5. **Manual.** Walk the spec's manual check with the person. Set Status: Implemented.
6. **Trace.** `node scripts/trace.mjs --check` passes, CHANGELOG has an entry. Status becomes Verified once CI is green.

When the code shows the spec is wrong, stop and propose the spec change. Then update the spec, the tests and the code, in that order.

## Rules

- Every `$` call lives in `hooks/register.tsx`. `hooks/model`, `parse`, `layout` and `render` are pure: data in, data out. `validate` rejects `$` passed across files.
- Renderers take the element table from `$.ui.resolve(e)` as an argument, and pick the renderer by what the table holds (`Raster`, else `Svg`, else the list).
- Observation only: every hook returns `next(e)`'s result unchanged, and updates state after `await next(e)`. Gating hooks end with `.catch(($, e, next) => next(e))`.
- State writes go through `update` (never `get` then `set`), one event to one write of `graph`. `ui.render` only reads.
- Hooks do constant work. Layout and `git` are enqueued and run off the hook's return path (architecture D5).
- Only the `$` methods allowed by NFR-S1 (`specs/03-nfr/spec.md`). No `$.http`, `$.store`, `$.fs`; `$.model.fork` only on an "Ask why" press; `$.process.run` only read-only `git` and the editor command, by argument list.
- Tests go through the `claude-code/testing` kit; only `parse` and `layout` are imported directly. Tool output in fixtures is captured from real runs, never typed by hand.
- The API reference is `.claude-plugin/types/claude-code/index.d.ts`. Grep it for the event or method at hand and trust it over memory. When it disagrees with a spec, the spec gets an open question.
- IDs: requirement `F03-R2`, criterion `F03-AC4`, question `F03-Q1`, non-functional `NFR-P1`, checkpoint `RS-3`. Commits name them: `feat(F03): compaction state (F03-AC1..AC4)`; spec-only changes use `spec(F03): …`.

## Commands

- Run: copy `fixtures/sample-app` to a temporary folder, `git init` and commit it there, then `claude --plugin-dir <path to this repository>`.
- Check: `npx tsc -p . && claude plugin test && node scripts/check-calls.mjs` (`check-calls.mjs` runs `claude plugin validate --json .` and fails on any error or warning except the one for this file at the plugin root)
- Trace: `node scripts/trace.mjs --check`

Start each implementation session with `/plugin-authoring`: it knows this build's events and methods.

## Done

A feature is done when every acceptance criterion has a passing test, the checks pass, the manual check is done, and CHANGELOG is updated.
