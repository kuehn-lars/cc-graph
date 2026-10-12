# 01: A plain `rg -n` becomes search nodes: the first full path

**What to build:** When Claude runs a single search command through `Bash` (`rg -n "verify" src/auth`, `grep -rn verify src`, `git grep -n verify`), every file in its hits appears in the `graph` as `search` with `hits`, `tokens`, `readId` and `seen` "N search hits, never opened". A file Claude already read stays as it is and only counts the hits; a `ghost`, `compacted` or `unread` file turns `search`. One search call adds one copy: running the same search again adds its hits and tokens again, and a file coming back from `compacted` starts from this call and says "since compaction". Commands that are not searches, failed calls and interrupted calls add nothing, and the hook hands back what it received.

This ticket builds the shape tickets 02 to 04 extend, along the lines F01 laid down: a `Bash` `tool.call` hook in the wiring turns the command and `result.stdout` into one action, and a pure reducer applies it through a single `update` of `graph` (one call, one write, however many files it hits).

- **`searchesIn(command)`**, first cut: one command segment, tokenized with quotes and backslashes honoured and nothing expanded (the reference session's `rg -n "verify" src/auth` needs the quotes), `NAME=value` prefixes skipped, `rg`, `grep`, `egrep`, `fgrep` and `git grep` recognised. Ticket 02 adds the segment split.
- **`hitsIn(stdout, search)`**, first cut: the `path:line:text` and `path:text` forms, at most 1,000 lines, inline `stdout` only. Ticket 03 adds the other forms.
- **`hitsIn` returns the characters of each path's hit lines**, so the reducer can add `ceil(chars / 4)` per call (F02-R5). Why calls add up and `compacted` restarts: `research-repeated-search.md`.

Requirements: F02-R1 (single segment), F02-R2 (the two `path:` forms), F02-R4, F02-R5, F02-R6, F02-R7, F02-R9 (the line cap; the persisted-output case is ticket 03).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Table-driven `searchesIn` and `hitsIn` tests over the captured `rg -n`, `grep -rn` and `git grep -n` output in `fixtures/output/`
- [ ] F02-AC1 two hit lines in `password.ts` give one `search` node, `hits` 2, "2 search hits, never opened"
- [ ] F02-AC2 a `read` node hit by a search stays `read` and its `hits` grows
- [ ] F02-AC4 `npm test` output holding `src/a.ts:3` changes nothing (DERIVED: no real successful command prints that line)
- [ ] F02-AC6 `git grep -n` hits are counted as for `rg -n`
- [ ] F02-AC7 a `compacted` node hit by a search becomes `search`
- [ ] F02-AC13 the same search run twice over a `search` node gives `hits` 4, twice the `tokens`, and the second call's `readId`
- [ ] F02-AC14 a `compacted` node with 5 hits, hit twice, is `search` with `hits` 2 and "2 search hits since compaction"
- [ ] A `read` or `partial` node hit by a search keeps its `tokens`, `seen` and `readId` (F02-R5; checked in the AC2 test)
- [ ] F02-AC12 a search whose result has `interrupted: true` changes nothing (DERIVED from a recorded result)
- [ ] An `isError` search changes nothing (F02-R7), and every case returns what the handler beneath returned
- [ ] The check command passes
