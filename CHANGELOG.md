# Changelog

Versions follow semver. Each release names the Claude Code versions it was tested on.

## Unreleased

- Plugin skeleton: `plugin.json`, `marketplace.json`, an empty hooks module, the `$.state` contract (02 Data model) and the Claude Code 2.1.296 types.
- `fixtures/sample-app` (04 Reference session) and real `rg`, `grep` and `git` output in `fixtures/output/`, with `capture.sh` to record it again.
- `scripts/trace.mjs`, `scripts/check-calls.mjs` and CI on Claude Code 2.1.296 and `latest`.
- Spike S0 (ARCH-Q1): off-path `$.clock.after` work may run `git` and write state after its hook returned, and the write redraws the pane.
- Spike S1 (F03-Q1, F07-Q1): `file` attachments after a compaction name the absolute path on their first line; no `edited_text_file` was seen in 2.1.296.
- F01 file tracking: a successful text `Read` becomes a `read` or `partial` node with `seen`, `tokens` and `readId`; paths are relative to the working directory (F01-AC1..AC3, AC7, AC10).
