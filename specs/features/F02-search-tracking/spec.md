# F02 Search-only tracking

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Review | v0.1 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | F01 |

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

- **F02-R1** When a `Bash` call succeeds (no `isError`, `result.interrupted` false) and its command holds a search, the mod parses `result.stdout` for hits. A search is a command segment (split on `|`, `&&`, `||` and `;`, outside quotes) whose first word after any `NAME=value` assignments is `rg`, `grep`, `egrep` or `fgrep`, or whose first two words are `git grep`.
- **F02-R2** The mod reads these hit forms, one per line: `path:line:text`, `path:text`, and a bare path for `-l` or `--files-with-matches`. When the search has exactly one path operand and no output line starts with a path, every line is a hit in that operand. A line whose path part has a space, or neither a `/` nor a `.`, is skipped.
- **F02-R3** When a search's flags make it print no hits (`--files`, `-c` or `--count`, `--json`, `-q`, `-L`), or it reads standard input (it is not the first segment of a pipeline and has no path operand), the mod adds nothing for it.
- **F02-R4** When a hit names a path with no node, or a `ghost`, `compacted` or `unread` node, the mod sets it to `search`. A `read`, `partial` or `search` node keeps its state and adds the hits to `hits`.
- **F02-R5** The mod sets a search node's `tokens` to `ceil(characters of its hit lines / 4)` and its `seen` to "N search hits, never opened".
- **F02-R6** When a command holds no search (`ls`, `cat`, `npm test`), the mod adds nothing, even when its output looks like `path:line`.
- **F02-R7** If the call failed or was interrupted, then the mod adds nothing.
- **F02-R8** The mod resolves relative hit paths against the working directory, or, when the search segment follows `cd <literal path> &&` in the same command, against that path. If the directory cannot be known (a variable, `cd -`, a subshell), then the mod drops that search's hits.
- **F02-R9** The mod parses at most 1,000 lines per call and parses only the inline `stdout`: when Claude Code persisted a long output elsewhere, Claude also saw only the inline part.

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

## Implementation decisions

- **Two pure functions in `parse`.** `searchesIn(command)` splits and tokenizes the command (quotes and backslashes honoured, nothing expanded) and returns each search with its flags, operands and working directory. `hitsIn(stdout, search)` returns hits per path with the characters of their lines. The reducer only applies the state rule.
- **A fixed list of supported forms.** Search tools have many output modes; guessing at the rest would invent nodes. Unknown lines are skipped and unsupported flags add nothing, so the failure mode is a missing hit, never a false one.
- **Inline output only.** When a long output is persisted to a file, Claude saw only what was inline, so that is what the graph shows.
- **`Grep` and `Glob` tools are not handled.** Native builds of Claude Code register neither (2.1.296 types), so every search runs through `Bash`.

## Testing decisions

- **Secondary seam for the parser:** `searchesIn` and `hitsIn` get table-driven unit tests over output captured from `rg`, `grep -rn`, `grep -l` and `git grep -n` in `fixtures/sample-app`, kept in `fixtures/output/`.
- **Primary seam for the rules:** event tests raise `$.tool.call({ tool: 'Bash', command })` with the test's hook beneath answering `{ result: { stdout, stderr: '', interrupted: false } }`, then read the `graph` key (F02-AC1, AC2, AC4, AC7).

## Mods API used

| Need | Event or method |
| --- | --- |
| Search commands and their output | `tool.call` with `{ tool: 'Bash' }`, after `await next(e)`: `e.command`, `result.stdout`, `result.interrupted`, `isError` |

## Data model changes

Adds the `search` state and the `hits` field.

## Manual check

1. In a copy of `fixtures/sample-app`, ask Claude: "Find where `verify` is used, without opening any file."
2. `/graph list` shows the hits as `◌` rows with "N search hits, never opened".
3. Ask Claude to read one of them: its row turns `●`.

## Out of scope

- The `Grep` and `Glob` tools, which native builds do not register. Revisit if a build adds them back.
- Context lines (`-A`, `-B`, `-C`): their lines are not hits, and `rg` marks them with `-` instead of `:`; they are skipped.
- Searches run by subagents are attributed by F15 like any other touch.

## Open questions

- [x] **F02-Q1** Does this build still offer a `Grep` tool, or does all search run through `Bash`? Answered from the 2.1.296 types: native builds register no `Grep` or `Glob` tool; all search runs through `Bash`.

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Checked against the 2.1.296 types: no `Grep` tool. Added the single-operand form, standard-input and count-only exclusions, `cd` handling, the parse limit, and inline-only output.
