# 04: Commits, merges, checkouts

**What to build:** A deletion committed in the same command, and files a merge or checkout brings in, show as `deleted` or `created`. A file committed from untracked never reads as deleted. Each status takes `git rev-parse HEAD` with it; when `HEAD` moved, `git diff --name-status -z --no-renames <old> <new>` names the files. `scripts/check-calls.mjs` allows `diff` (NFR-S5).

Requirements: F07-R11, R14; NFR-S5, NFR-P6.

**Blocked by:** 03

**Touches:** `parse` (a `--name-status -z` parser, `shellChanges` with the diff), the wiring (`HEAD` in the baseline), `scripts/check-calls.mjs`.

**Status:** done

- [x] F07-AC17, AC18, AC19
- [x] Unit tests for the name-status parser
- [x] The check command passes
