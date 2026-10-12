# 03: Output modes: `-l`, a single file operand, count-only flags

**What to build:** The other ways a search prints its hits are read, the ways it prints no hits add nothing, and an output too long to stay inline counts only what Claude read of it. `rg -l verify` names three files, so the graph has three `search` nodes. `rg verify src/auth/login.ts` prints lines with no path, and they all count for `login.ts`. `rg -c verify src` prints counts, not hits, so nothing changes.

`hitsIn` handles:
- a bare path per line for `-l` and `--files-with-matches`;
- the single-operand form: when the search has exactly one path operand and no output line starts with a path, every line is a hit in that operand;
- skipping a line whose path part has a space, or has neither a `/` nor a `.`. This also skips `-A`, `-B` and `-C` context lines (Out of scope), checked against the captured `rg -n -A1` output.

`--files`, `-c`/`--count`, `--json`, `-q` and `-L` add nothing (F02-R3).

When `result.persistedOutputPath` is set, Claude got only a 2,000-character preview, so the hits come from the call's `text`, not `stdout` (F02-R9). Record a real one: in a copy of the sample app with a file large enough that one `rg -n` prints over 30,000 characters (added to the copy only, as F01 did with `big.log`), run the search through `claude -p` and keep the call's result as `fixtures/tool-results` does. If `stdout` turns out to hold only the preview too, say so in the fixture README; the test still passes, and the research note's inference is corrected.

Requirements: F02-R2 (the remaining forms), F02-R3 (the flags), F02-R9 (persisted output).

**Blocked by:** 01 A plain `rg -n` becomes search nodes

**Status:** ready-for-agent

- [ ] Table-driven `hitsIn` cases over the captured `rg -l`, `grep -rl`, `rg verify src/auth/login.ts`, `rg -n -A1` and `rg --files` output
- [ ] F02-AC3 `rg -l verify` output of three paths gives three `search` nodes
- [ ] F02-AC9 `rg -c verify src` changes nothing
- [ ] F02-AC10 `rg verify src/auth/login.ts`, whose two lines carry no path, gives `src/auth/login.ts` 2 hits
- [ ] A search whose output was persisted is recorded into `fixtures/tool-results/`, with how to record it again
- [ ] F02-AC15 with `persistedOutputPath` set, only the hits in the preview (`text`) count, none from the rest of `stdout`
- [ ] The check command passes
