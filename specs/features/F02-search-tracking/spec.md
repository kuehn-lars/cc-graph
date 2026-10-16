# F02 Search-only tracking

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Verified | v0.1 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | F01 |

## Problem

Claude often learns about a file from `rg` or `grep` output without ever opening it. In the transcript a search looks like knowledge, so a reader assumes Claude knows a file it has only seen two lines of.

## Solution

Files Claude saw only as search hits appear as dotted nodes with the number of hits, labelled "never opened". A search never upgrades a file Claude really read, and a file seen only in search turns solid the moment Claude reads it.

## User stories

1. As a developer, I want files seen only in search output marked as such, so that I never mistake a grep for a read.
2. As a developer, I want the hit count on each search-only file, so that I can tell a passing mention from a heavy match.
3. As a developer, I want a search to leave a file Claude already read as it is, so that the pane never downgrades real knowledge.
4. As a developer, I want commands that only look like searches (test runners, logs) ignored, so that the graph doesn't fill with noise.
5. As a developer, I want a file Claude lost to compaction and then found again by search shown as search-only, so that I see it only has the hits back.

## Requirements

- **F02-R1** When a `Bash` call succeeds (no `isError`, `result.interrupted` false) and its command holds a search, the mod parses its output for hits (F02-R9). A search is a command segment (split on `|`, `&&`, `||`, `;` and newlines, outside quotes; the lines of a here-document, `<<EOF` to `EOF`, are its text, not commands) whose first word after any `NAME=value` assignments is `rg`, `grep`, `egrep` or `fgrep`, or whose first two words are `git grep`.
- **F02-R2** The mod reads these hit forms, one per line: `path:line:text`, `path:text`, and a bare path for `-l` or `--files-with-matches`. When the search has exactly one path operand and no output line starts with a path, every line is a hit in that operand. A line whose path part has a space or a quote, or neither a `/` nor a `.`, or that ends in the colon after its path (`src/auth:`, how `ls` heads a folder's listing), is skipped. A flag's value (`-t ts`, `-g '*.ts'`, `-m 5`) and a redirection (`2>&1`) are not operands, and a pattern given by `-e` or `-f` leaves every operand a path.
- **F02-R3** When a search's flags make it print no hits (`--files`, `-c`, `--count` or `--count-matches`, `--json`, `-q`, `--files-without-match`, and `-L` for `grep` and `git grep`, where it means the same; for `rg` `-L` is `--follow` and its hits count), or it reads standard input (it is not the first segment of a pipeline and has no path operand), the mod adds nothing for it.
- **F02-R4** When a hit names a path with no node, or a `ghost`, `compacted` or `unread` node, the mod sets it to `search` with `hits` set to this call's hits. A `read`, `partial` or `search` node keeps its state and adds this call's hits to `hits`. One search call adds one copy: the same line found by two calls counts twice, because Claude's context holds both outputs.
- **F02-R5** For a node that is `search` after the call, the mod adds `ceil(characters of this call's hit lines / 4)` to `tokens` (a node that just became `search` starts from 0), sets `readId` to the call's `tool_use_id`, and sets `seen` to "N search hits, never opened", or to "N search hits since compaction" when the node became `search` from `compacted`, and it keeps saying so while later searches add to it. N is `hits`, and "1 search hit" when it is 1. A `read` or `partial` node keeps its `tokens`, `seen` and `readId`: the file's own size is what the meter counts.
- **F02-R6** When a command holds no search (`ls`, `cat`, `npm test`), the mod adds nothing, even when its output looks like `path:line`.
- **F02-R7** If the call failed or was interrupted, then the mod adds nothing.
- **F02-R8** The mod resolves relative hit paths against the directory the command starts in, or, when the search segment follows `cd <literal path> &&` in the same command, against that path. If the directory cannot be known (a variable, `cd -`, a subshell, or a `cd` ended by `;`, a newline or `||`, since the search would run even if the `cd` failed), then the mod drops that search's hits. The directory a command starts in is `$.session.cwd()`, read before the call runs: Claude Code's `Bash` tool keeps a `cd` from one call for the next, so it may not be the working directory.
- **F02-R9** The mod parses at most 1,000 lines per call, and only what Claude read: `result.stdout`, or, when `result.persistedOutputPath` is set (the output passed `bashOutputMaxChars` and Claude got a preview of it), the call's `text`. `text` is not used otherwise, because it also carries `stderr`.
- **F02-R10** When a command holds more than one search that reads files, the mod adds nothing, because their outputs run together and cannot be told apart.

## Acceptance criteria

- **F02-AC1** Given output with two lines `src/auth/password.ts:12:verify(`, then one `search` node with `hits` 2 and `seen` "2 search hits, never opened".
- **F02-AC2** Given `src/a.ts` is `read`, when a search hits it, then it stays `read` and its `hits` grows.
- **F02-AC3** Given `rg -l verify` output of three paths, then three `search` nodes.
- **F02-AC4** Given `npm test` output containing `src/a.ts:3`, then nothing changes.
- **F02-AC5** Given `npm run lint && rg -n verify src | head -20`, then the hits in the output are counted.
- **F02-AC6** Given `git grep -n verify` output, then hits are counted as for `rg -n`.
- **F02-AC7** Given `src/a.ts` is `compacted`, when a search hits it, then it is `search`.
- **F02-AC8** Given `cd src && rg -n verify auth` with output `auth/password.ts:12:verify(`, then the node is `src/auth/password.ts`.
- **F02-AC9** Given `rg -c verify src`, then nothing changes.
- **F02-AC10** Given `rg verify src/auth/login.ts` whose two output lines carry no path, then `src/auth/login.ts` gains 2 hits.
- **F02-AC11** Given `cat log.txt | rg -n error`, then nothing changes.
- **F02-AC12** Given a search whose result has `interrupted: true`, then nothing changes.
- **F02-AC13** Given `src/a.ts` is `search` with 2 hits from a search, when the same search runs again, then `hits` is 4, `tokens` is twice what it was, and `readId` is the second call's `tool_use_id`.
- **F02-AC14** Given `src/a.ts` is `compacted` with 5 hits, when a search hits it twice, then it is `search` with `hits` 2 and `seen` "2 search hits since compaction".
- **F02-AC15** Given a search result with `persistedOutputPath` set, then only the hits in the preview Claude read (`text`) are counted, none from the rest of `stdout`.
- **F02-AC16** Given `grep -rL verify src`, then nothing changes; given `rg -L verify src`, its hits count.
- **F02-AC17** Given `rg -n verify src; rg -n error tests`, then nothing changes.
- **F02-AC18** Given `grep -rn verify src ; echo '---'; ls src src/*`, then only `src/auth/login.ts` and `src/auth/password.ts` get hits, and none of the folders `ls` heads with `src/auth:`.
- **F02-AC19** Given `ls src src/middleware 2>&1; rg -n log src`, where the output holds `"src/middleware": No such file or directory`, then `"src/middleware"` gets no hit.
- **F02-AC20** Given an earlier `Bash` call ran `cd src`, so the next starts in `src`, when `rg -n verify auth` prints `auth/login.ts:23:…`, then `src/auth/login.ts` gets the hit.
- **F02-AC21** Given `cat > notes.md <<'EOF'`, a body line `grep -n x src`, `EOF`, then `rg -n verify src`, then `rg`'s hits count: the body line is no second search.

## Implementation decisions

- **Two pure functions in `parse`.** `searchesIn(command)` splits and tokenizes the command (quotes and backslashes honoured, nothing expanded) and returns each search with its flags, operands and working directory. `hitsIn(stdout, search)` returns hits per path with the characters of their lines. The reducer only applies the state rule.
- **A fixed list of supported forms.** Search tools have many output modes; guessing at the rest would invent nodes. Unknown lines are skipped and unsupported flags add nothing, so the failure mode is a missing hit, never a false one.
- **What Claude read, nothing more.** When a long output is persisted to a file, Claude saw only the preview, so that is what the graph shows.
- **One search call adds one copy.** Bash results are never deduplicated, and nothing a plugin can see clears them before a compaction (`research-repeated-search.md`), so `hits` and `tokens` add up per call. A node coming back from `compacted` starts again, because the compaction took every earlier output. `readId` on a search node lets F03-R1 keep it when the compaction keeps its latest search call.
- **`Grep` and `Glob` tools are not handled.** Native builds of Claude Code register neither (2.1.296 types), so every search runs through `Bash`.

## Testing decisions

- **Secondary seam for the parser:** `searchesIn` and `hitsIn` get table-driven unit tests over output captured from `rg`, `grep -rn`, `grep -l` and `git grep -n` in `fixtures/sample-app`, kept in `fixtures/output/`.
- **Primary seam for the rules:** event tests raise `$.tool.call({ tool: 'Bash', command })` with the test's hook beneath answering `{ result: { stdout, stderr: '', interrupted: false } }`, then read the `graph` key (F02-AC1, AC2, AC4, AC7).

## Mods API used

| Need | Event or method |
| --- | --- |
| Search commands and their output | `tool.call` with `{ tool: 'Bash' }`, after `await next(e)`: `e.command`, `e.tool_use_id`, `result.stdout`, `result.interrupted`, `result.persistedOutputPath`, `text`, `isError` |

## Data model changes

Adds the `search` state and the `hits` field. A search node's `readId` is its latest search call.

## Manual check

1. In a copy of `fixtures/sample-app`, ask Claude: "Find where `verify` is used, without opening any file."
2. `/graph list` shows the hits as `◌` rows with "N search hits, never opened".
3. Ask Claude to read one of them: its row turns `●`.

## Out of scope

- The `Grep` and `Glob` tools, which native builds do not register. Revisit if a build adds them back.
- Context lines (`-A`, `-B`, `-C`): their lines are not hits, and `rg` marks them with `-` instead of `:`; they are skipped. Known limit: without `-n` a context line whose text holds a `:` looks like a hit.
- A file at the root with no extension (`Makefile`) in `-l` output: R2 skips a path with neither a `/` nor a `.`, so it is missed, never invented.
- Searches run by subagents are attributed by F15 like any other touch.
- Tool-result clearing before a compaction (keep-recent microcompact, clearing after idle): both are behind remote flags, off in 2.1.296, and no event reports them. See 02 Data model, Estimates.

## Open questions

- [x] **F02-Q1** Does this build still offer a `Grep` tool, or does all search run through `Bash`? Answered from the 2.1.296 types: native builds register no `Grep` or `Glob` tool; all search runs through `Bash`.

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Checked against the 2.1.296 types: no `Grep` tool. Added the single-operand form, standard-input and count-only exclusions, `cd` handling, the parse limit, and inline-only output.
- 2026-10-11 Approved by the owner.
- 2026-10-12 Ticketing, from `research-repeated-search.md`: one search call adds one copy and a node back from `compacted` starts again (R4, R5, AC13, AC14); a search node's `readId` is its latest search call and its `seen` says "since compaction" when it came back from `compacted`; a persisted output is parsed from the preview Claude read (R9, AC15). Approved by the owner.
- 2026-10-12 Review of the implementation, approved by the owner: `-L` depends on the tool (R3, AC16); `--count-matches` and newlines listed (R1, R3); flag values and redirections are not operands (R2); "1 search hit" and the sticky "since compaction" (R5); a `cd` ended by `;`, a newline or `||` drops the hits (R8); a command with two file-reading searches adds nothing (R10, AC17); two known limits under Out of scope.
- 2026-10-12 Implemented and manually checked by the owner; CI green. Verified.
- 2026-10-13 Review: an `ls` after a search in the same command put its folder headers (`src/auth:`) in the graph as search nodes; a line ending in its path's colon is no hit (R2, AC18). Found in the owner's manual check of F09.
- 2026-10-15 A quoted path is no hit (R2, AC19): an error line of another segment, `"src/middleware": No such file or directory`, made a search node in a real session the owner asked to be tested. The status stays Verified, to be confirmed with the review.
- 2026-10-15 R1: a here-document's lines are text, not commands (AC21). Claude writes files with `cat > f <<'EOF'`; a body line that began with `grep` dropped the real search's hits (R10). The status stays Verified, to be confirmed with the review.
- 2026-10-15 R8 resolves from where the command starts, `$.session.cwd()` read before the call: Claude Code's `Bash` tool keeps a `cd` for the next call, and a real session put every path after `cd src` in the wrong place (AC20). The status stays Verified, to be confirmed with the review.
- 2026-10-16 The changes of 2026-10-15 (R1, R2, R8, AC19 to AC21) approved by the owner. The status stays Verified.
