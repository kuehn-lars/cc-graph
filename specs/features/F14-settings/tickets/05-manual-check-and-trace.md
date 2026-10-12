# 05: Manual check, trace and CHANGELOG

**What to build:** F14 (`maxNodes`) closed out for v0.1.

Walk the spec's manual check with the person: install from the local marketplace (`claude plugin marketplace add ./`, `claude plugin install cc-graph@cc-graph`), open `/config` and see "Most files in the graph" with default 60; set it to 20, run a wide session, see at most 20 files with every changed one kept. Steps 3 (editor command) waits for v0.4; note that in the spec. Fixes found here stay uncommitted until the person confirms.

**Blocked by:** 03, 04

**Status:** done

- [x] Manual check done in a terminal and in the desktop app
- [x] Spec Status: Implemented, with a note that only `maxNodes` is in v0.1
- [x] `node scripts/trace.mjs --check` passes
- [x] CHANGELOG entry for F14 (`maxNodes`)
