# CC Graph

A [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview) that draws a live pane beside the conversation: which files Claude read, searched and changed, what is still in its context window, which memory files it works under, what it was thinking, and which code that depends on its changes it never opened.

> **Status: specification.** The design is written and checked against the Claude Code 2.1.296 Mods API; implementation starts with milestone [M0](ROADMAP.md#m0-foundations). There is nothing to install yet.

## What it answers

After a long turn, nobody can say without scrolling back what Claude actually has in context. CC Graph answers four questions at a glance:

1. **Did Claude read the whole file**, only part of it, only see search hits, or lose it to compaction?
2. **What depends on what it changed**, and did it ever open those files?
3. **What changed behind its back**: a shell command, a formatter, you?
4. **What was it thinking** when it made that change?

Every file is a node whose look says what Claude saw of it. Changes carry a ring and a word. Files that import a change but were never opened are flagged as blind spots, with one key to `@`-mention them into your prompt. A list view carries the same facts on every surface.

## How it works

CC Graph only watches. Its hooks see tool calls, compactions and the model's stream, pass every result on untouched, and record what happened in session memory. The graph is built only from text Claude's own tools already returned, plus read-only `git` for the reverse direction of imports. The [architecture spec](specs/01-architecture/spec.md) has the details.

## Privacy

- Nothing leaves your machine. CC Graph makes no network requests and writes no files.
- It keeps paths, sizes, counts and short thinking excerpts in session memory only, never file contents, and drops them when the conversation ends. Thinking capture can be switched off.
- The only model call is "Ask why", and only when you press it.
- The only processes it starts are read-only `git` and the editor command you configure, never through a shell.
- Check it yourself: `claude plugin validate` on a clone lists every event CC Graph hooks and every API method it calls. The allowed list is in [NFR-S1](specs/03-nfr/spec.md#privacy-and-security), and CI fails if the code goes beyond it.

## Requirements

Claude Code v2.1.287 or later in the terminal, or the desktop app's Code tab (v2.1.286 or later). Other surfaces run the hooks but draw no mod output.

## Install

Once v0.1 is released:

```text
/plugin install cc-graph --marketplace kuehn-lars/cc-graph
```

Then run `/graph`.

## Develop

```sh
claude --plugin-dir .          # run with the mod loaded (use a copy of fixtures/sample-app)
npx tsc -p . && claude plugin test && node scripts/check-calls.mjs   # check-calls runs claude plugin validate --json .
node scripts/trace.mjs --check # every approved acceptance criterion has a test
```

The project is spec-driven: [`specs/`](specs/README.md) is the source of truth, and each feature goes from spec to failing tests to code. [`ROADMAP.md`](ROADMAP.md) shows what ships when. Instructions for Claude Code working on this repository are in [`CLAUDE.md`](CLAUDE.md).

## License

[MIT](LICENSE)
