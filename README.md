<div align="center">

<img src=".github/assets/header.svg" alt="cc-graph: see what Claude knows" width="100%">

<br><br>

[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fkuehn-lars%2Fcc-graph%2Fmain%2F.claude-plugin%2Fplugin.json&query=%24.version&label=version&prefix=v&style=plastic&color=D97757&logo=semver&logoColor=white)](CHANGELOG.md)
[![Claude Code](https://img.shields.io/badge/Claude_Code-%E2%89%A5_2.1.287-D97757?style=plastic&logo=claude&logoColor=white)](https://code.claude.com/docs/en/plugins/mods/overview)
[![Surface](https://img.shields.io/badge/surface-terminal-5769F7?style=plastic&logo=gnometerminal&logoColor=white)](#install)
[![TypeScript](https://img.shields.io/badge/hooks-TypeScript-3178C6?style=plastic&logo=typescript&logoColor=white)](hooks/register.tsx)
[![CI](https://img.shields.io/github/actions/workflow/status/kuehn-lars/cc-graph/ci.yml?branch=main&style=plastic&label=CI&logo=githubactions&logoColor=white)](https://github.com/kuehn-lars/cc-graph/actions/workflows/ci.yml)
[![Network](https://img.shields.io/badge/network-none-4EBA65?style=plastic&logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzRFQkE2NSIgZD0iTTEyIDFhNSA1IDAgMCAwLTUgNXY0SDVhMSAxIDAgMCAwLTEgMXYxMWExIDEgMCAwIDAgMSAxaDE0YTEgMSAwIDAgMCAxLTFWMTFhMSAxIDAgMCAwLTEtMWgtMlY2YTUgNSAwIDAgMC01LTV6bS0zIDVhMyAzIDAgMSAxIDYgMHY0SDlWNnoiLz48L3N2Zz4=)](#privacy)
[![License](https://img.shields.io/github/license/kuehn-lars/cc-graph?style=plastic&color=8c8b86&logo=opensourceinitiative&logoColor=white)](LICENSE)

<samp>[install](#install) · [the pane](#the-pane) · [privacy](#privacy) · [roadmap](#roadmap) · [changelog](CHANGELOG.md)</samp>

</div>

<br>

<samp>After a long turn, nobody can say without scrolling back what Claude actually has in context. **cc-graph** is a [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview) that draws it in a live pane beside the conversation: every file Claude read, searched or changed, how those files import each other, and what compaction took away.</samp>

<a name="install"></a>
<br>
<img src=".github/assets/h-install.svg" alt="install" width="100%">

```text
/plugin install cc-graph --marketplace kuehn-lars/cc-graph
```

<samp>Then type **/graph**. Needs Claude Code v2.1.287 or later, in the terminal.</samp>

<a name="the-pane"></a>
<br>
<img src=".github/assets/h-the-pane.svg" alt="the pane" width="100%">

<img src=".github/assets/showcase.svg" alt="The cc-graph pane in the terminal, annotated: the context window meter, partly read and compacted files, import edges, folder frames, size bars, the focus, search-only files, an edit and a new file, the now line and the legend" width="100%">

| <samp>control</samp> | <samp>what it does</samp> |
| :-- | :-- |
| <kbd>g</kbd> | <samp>graph view</samp> |
| <kbd>l</kbd> | <samp>list view</samp> |
| <kbd>1</kbd> … <kbd>9</kbd> | <samp>pick a row in the list</samp> |
| `maxNodes` = `60` | <samp>most files in the graph, in /config</samp> |
| `importEdges` = `on` | <samp>show file imports, in /config</samp> |
| `blindSpots` = `on` | <samp>look for blind spots with git, in /config</samp> |
| `captureThinking` = `on` | <samp>keep thinking excerpts, in /config</samp> |

<samp>Files a shell command created, deleted or changed show too, named with the command that did it, and so do files Claude read with `cat`, `head` or `sed -n`. Files that import a change but were never opened are flagged as blind spots while the turn is still running.</samp>

<samp>The list also shows Claude's newest thinking: a short excerpt per step, with its turn and the files that step read or changed. Claude Code passes thinking text to mods only when `"showThinkingSummaries": true` is in your settings (or with `--thinking-display summarized`). This holds for every 5.5 model: Opus, Sonnet and Haiku. Without it, the footer says thinking is hidden.</samp>

<a name="privacy"></a>
<br>
<img src=".github/assets/h-privacy.svg" alt="privacy" width="100%">

<samp>cc-graph only watches. Its hooks pass every tool result on untouched and record what happened in session memory.</samp>

- <samp>**Nothing leaves your machine.** No network requests, no model calls, no files written.</samp>
- <samp>**Paths, sizes and counts**, never file contents. The one exception is Claude's newest 20 thinking excerpts, at most 400 characters each, and only while `captureThinking` is on. All of it is gone when the conversation ends or on /clear.</samp>
- <samp>**The only process it starts is read-only git**, by argument list, never through a shell.</samp>
- <samp>**Check it yourself:** claude plugin validate lists every event cc-graph hooks and every API method it calls. CI fails if the code goes beyond the [allowed list](specs/03-nfr/spec.md#privacy-and-security).</samp>

<a name="roadmap"></a>
<br>
<img src=".github/assets/h-roadmap.svg" alt="roadmap" width="100%">

<img src=".github/assets/roadmap.svg" alt="Roadmap: M0 Foundations, v0.1 What Claude knows, v0.2 The graph and v0.3 Blind spots shipped; next v0.4 Why it did that, then v0.5 Desktop graph and pointer, v0.6 Decisions and timeline, v1.0 Hardening and listing" width="100%">

<samp>Features, exit gates and spikes per milestone are in [ROADMAP.md](ROADMAP.md).</samp>

<details>
<summary><samp><b>develop</b></samp></summary>

<br>

<samp>The project is spec-driven: [specs/](specs/README.md) is the source of truth, and each feature goes from spec to failing tests to code. Instructions for Claude Code working on this repository are in [CLAUDE.md](CLAUDE.md).</samp>

```sh
claude --plugin-dir .          # run with the mod loaded (use a copy of fixtures/sample-app)
npx tsc -p . && claude plugin test && node scripts/check-calls.mjs
node scripts/trace.mjs --check # every approved acceptance criterion has a test
```

</details>

<br>

<div align="center">
<samp><a href="LICENSE">MIT</a> © 2026 Lars Kühn · built with and for <a href="https://claude.com/claude-code">Claude Code</a></samp>
</div>
