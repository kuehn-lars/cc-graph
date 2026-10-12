# 02: Searches inside pipelines and command chains

**What to build:** A search counts wherever it sits in the command: `npm run lint && rg -n verify src | head -20` counts the hits `rg` printed. A search that reads standard input (`cat log.txt | rg -n error`) adds nothing, because its output names no file.

`searchesIn` splits the command on `|`, `&&`, `||` and `;` outside quotes, and finds the search in every segment. A search that is not the first segment of a pipeline and has no path operand reads standard input (F02-R3).

`fixtures/output/capture.sh` gains `cat log.txt | rg -n error`. The `log.txt` is created in the capture copy only, as F01 did with `big.log`, so the sample app stays as 04 Reference session approved it.

Requirements: F02-R1 (the segment split), F02-R3 (standard input).

**Blocked by:** 01 A plain `rg -n` becomes search nodes

**Status:** ready-for-agent

- [ ] `cat log.txt | rg -n error` captured into `fixtures/output/`
- [ ] Table-driven `searchesIn` cases: each separator, separators inside quotes, an escaped separator
- [ ] F02-AC5 `npm run lint && rg -n verify src | head -20` counts the hits (DERIVED: the sample app has no `lint` script, so the stdout is the captured `rg -n verify src | head -20`)
- [ ] F02-AC11 `cat log.txt | rg -n error` changes nothing
- [ ] The check command passes
