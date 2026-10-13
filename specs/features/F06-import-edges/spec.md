# F06 Import edges

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Approved | v0.2 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | F01, F09, F14 |

## Problem

A list of files says what Claude saw, not how those files hang together. Without edges, nobody can see that the file Claude just edited is imported by three others, or that Claude read a module but none of what it depends on. Projects mix languages, and some people want the graph without edges at all.

## Solution

Files are linked by their imports, found only in text that Claude's own tool results already carried. Imported files Claude never opened appear as faint ghosts at the end of an edge, so the graph shows the neighbourhood of what Claude touched without reading a single file itself. Imports are understood per language: TypeScript (with the JavaScript files a TypeScript project holds) and Python first, more languages later. One setting in `/config` switches import edges off.

## User stories

1. As a developer, I want import edges between the files Claude touched, so that I see how its reading list hangs together.
2. As a developer, I want imported files Claude never opened shown as ghosts, so that I see what it skipped.
3. As a privacy-minded developer, I want edges built only from text Claude already saw, so that the mod never reads my files.
4. As a developer, I want package imports ignored, so that the graph shows my code, not `node_modules`.
5. As a developer, I want an edge whose target file the mod could not confirm marked as guessed, so that I know when the graph is inferring.
6. As a TypeScript developer, I want `./util.js` in a `.ts` file linked to `util.ts`, so that the ESM habit of writing the output extension does not break edges.
7. As a Python developer, I want relative and package imports linked to the module files, so that my project's graph is as useful as a TypeScript one.
8. As a developer in a language the mod does not know yet, I want no edges rather than wrong ones, so that the graph never invents structure.
9. As a developer, I want to switch import edges off in `/config`, so that the graph shows only the files Claude touched, without ghosts.
10. As a maintainer, I want each language to be one self-contained entry, so that adding Go or Rust later touches one place.

## Requirements

- **F06-R1** When a text `Read` succeeds, the mod parses imports from `result.file.content`; when a `Write` succeeds, from `result.content`; when an `Edit` succeeds, from `result.newString`.
- **F06-R2** The mod picks the importing file's language by its extension: TypeScript for `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs` and `.cjs`; Python for `.py`. In TypeScript it recognizes `import … from 'x'`, `import 'x'`, `export … from 'x'`, `require('x')` and `import('x')`; in Python `from .x import y`, `from . import x`, `from ..x import y`, `import a.b` and `from a.b import c`.
- **F06-R3** The mod resolves a relative TypeScript specifier (`./`, `../`) against the importing file's folder, trying in order: the path as written, when it already ends in a known extension; the path with each extension of the importer's own family (`.ts`, `.tsx`, `.mts`, `.cts` for a TypeScript file; `.js`, `.jsx`, `.mjs`, `.cjs` for a JavaScript file), then of the other family; then `/index` with the same extensions. A TypeScript importer's specifier ending in `.js` tries `.ts`, then `.tsx`, before the path as written; `.jsx`, `.mjs` and `.cjs` try `.tsx`, `.mts` and `.cts`. A specifier whose written extension belongs to no language (`./styles.css`, `./user.service`) links only to a node that already exists. A candidate outside the working directory stays absolute (I4).
- **F06-R4** The mod resolves a relative Python module against the importing file's package (one level up per extra dot) as `x.py`, then `x/__init__.py`. An absolute Python module (`a.b`) resolves against the working directory as `a/b.py` or `a/b/__init__.py`, and only to a node that already exists.
- **F06-R5** The mod ignores bare specifiers: packages, `node:` built-ins, and path aliases such as `@/lib/x`.
- **F06-R6** When a candidate is already a node other than a ghost (a ghost is itself a guess), the mod links to it. Otherwise it links to the first candidate and marks the edge `guessed`.
- **F06-R7** When a target has no node, the mod adds it as a `ghost` (I3).
- **F06-R8** The mod never reads a file to find edges: the text comes only from Claude's own tool results (D6, NFR-S1).
- **F06-R9** If the text is longer than 200,000 characters, then the mod parses nothing from it.
- **F06-R10** The mod keeps one edge per pair of files and kind, ignores a file importing itself, and never removes an import edge.
- **F06-R11** If the importing file's extension belongs to no language, then the mod parses nothing from it.
- **F06-R12** While `importEdges` (F14) is `false`, the mod parses no imports and adds no import edge and no ghost for an import.

## Acceptance criteria

- **F06-AC1** Given `src/auth/login.ts` contains `import { verify } from './password'`, when it is read, then an edge `src/auth/login.ts → src/auth/password.ts` exists, marked `guessed`, and `src/auth/password.ts` is a `ghost`.
- **F06-AC2** Given `import React from 'react'`, then no edge and no node.
- **F06-AC3** Given `from .models import User` in `app/views.py`, then an edge to `app/models.py`.
- **F06-AC4** The hooks module calls no `$.fs` method (static check, NFR-S1).
- **F06-AC5** Given a 300,000-character `Read` result, then no edge is parsed from it.
- **F06-AC6** Given `src/auth/password.js` is already a node, when `login.ts` imports `./password`, then the edge points to `src/auth/password.js` and is not `guessed`.
- **F06-AC7** Given no nodes, when `src/a.ts` imports `./util.js`, then the edge points to `src/util.ts`, marked `guessed`.
- **F06-AC8** Given an `Edit` of `src/auth/login.ts` whose `newString` adds `import { rateLimit } from '../middleware/rateLimit'`, then an edge to `src/middleware/rateLimit.ts` exists.
- **F06-AC9** Given `import x from '@/lib/x'`, then no edge and no node.
- **F06-AC10** Given `login.ts` is read twice, then there is still one edge to `password.ts`.
- **F06-AC11** Given `docs/usage.md` shows `import { login } from '../src/auth/login'` in a code block, when it is read, then no edge and no node.
- **F06-AC12** Given `importEdges: false`, when `src/auth/login.ts` is read, then the graph has no edge, and `password.ts` and `sessions.ts` have no node.

## Implementation decisions

- **One entry per language in `parse`.** A language is its file extensions, a function that lists the specifiers in a text, and a function that turns one specifier into ordered candidate paths (`candidatesFor(specifier, importer, workingDir)`). `importsIn(text, path)` picks the entry by the path's extension and returns nothing when none matches. Adding a language is adding an entry and its parse table; nothing in `model`, `render` or the wiring changes. The reducer picks a candidate by the existing nodes, so resolution never needs the file system.
- **JavaScript belongs to the TypeScript entry.** The two share their import syntax and resolve into each other (`./util.js` names `util.ts`), and TypeScript projects hold `.js` files. A separate JavaScript entry would duplicate the parser for no difference in behaviour.
- **The importer's family goes first.** Without reading the disk the mod cannot know which file exists, so it guesses in the order the importer's own language would resolve. In a TypeScript project that guess is almost always right, including the ESM habit of writing `./util.js` for `util.ts`.
- **One write per event.** The imports ride on the same action as the `Read`, `Write` or `Edit` they came from, so the node, its edges and its ghosts land in one update of `graph` (I9).
- **The setting stops the parsing, not the drawing.** With `importEdges` off the mod does no import work at all, so no renderer needs a rule for hidden edges and the eviction cap (I5) is not spent on ghosts. Options are fixed per activation (F14-R2): edges already in the graph when the setting is switched off stay until `/clear` (F06-Q2).
- **Guessed edges look like any other.** The card says "(path guessed)"; drawing them differently would add a visual rule for a rare case. F07's `git grep` confirms edges in the reverse direction, by resolving each hit's specifier with the same language entry.
- **Edges are never removed.** An edit's `newString` shows what was added, not the whole file, so the mod cannot tell that an import was deleted. A stale edge is less harmful than a missing one.

## Testing decisions

- **Primary seam:** event tests through the engine test kit, with recorded `Read`, `Write` and `Edit` results, for ghost creation, the existing-node preference, deduplication, the size limit, an unknown language and the setting (F06-AC1, AC3, AC5, AC6, AC7, AC8, AC10, AC11, AC12). The setting is passed as `test(name, { options: { importEdges: false } }, …)`, as the F14 tests pass `maxNodes`.
- **Secondary seam:** table-driven unit tests per language for `importsIn` and `candidatesFor`, over TypeScript, JavaScript and Python snippets, including comments and strings that look like imports (F06-AC2, AC9). A new language brings its own table.
- **Fixtures:** the reference session covers `login.ts`, the `rateLimit.ts` write and the `login.ts` edit. A new recording in a copy of `fixtures/sample-app`, with extra files that stay out of the sample app, covers `src/auth/password.js`, `src/a.ts` importing `./util.js`, a Python package `app/` and a `docs/usage.md`. A `Read` over 256 KB errors instead of returning text, so F06-AC5's result is derived from a recorded text `Read`, and its test says so.
- F06-AC4 is the existing `check-calls.mjs` allowlist step.

## Mods API used

| Need | Event or method |
| --- | --- |
| Source text | F01's `tool.call` results: `Read` `file.content`, `Write` `content`, `Edit` `newString` |
| The setting | `userConfig` `importEdges` in `.claude-plugin/plugin.json`, read through `register(on, options)` (`PluginOptions`) |

## Data model changes

Adds `Edge` with `kind: 'import'` and `guessed`, and the `ghost` state for import targets. Both are already in the state contract.

## Manual check

1. In a copy of `fixtures/sample-app`, ask Claude to read `src/auth/login.ts`.
2. The graph shows edges to `password.ts` and `sessions.ts` as ghosts; the package import of `rate-limiter-flexible` in a later step adds nothing.
3. Add `app/__init__.py`, `app/models.py` and `app/views.py` (with `from .models import User`) to the copy, and ask Claude to read `app/views.py`. An edge to `app/models.py` appears, the model a ghost.
4. Set `importEdges` off in `/config`, run `/clear`, and ask Claude to read `src/auth/login.ts` again. The graph holds `login.ts` alone.

## Out of scope

- Languages other than TypeScript, JavaScript and Python. Each later language is a new entry, with its own spec change listing its forms and its resolution rule.
- `tsconfig` path aliases, package `exports` maps, and Python packages installed outside the repository. They need configuration or the file system.
- A per-language switch. One setting covers all languages until someone needs finer control.
- Hiding existing edges when the setting is switched off mid-session (F06-Q2).
- Removing edges when an import is deleted.

## Open questions

- [x] **F06-Q1** Is a `guessed` edge worth drawing differently? Decided: no. It draws like any edge and the card says "(path guessed)" (see Implementation decisions).
- [ ] **F06-Q2** When `importEdges` is switched off mid-session, should the reload also drop the import edges and import-only ghosts already in the graph? Proposed: no, they stay until `/clear`. Dropping them needs a way to tell an import ghost from a mention or decision ghost. Not blocking.
- [ ] **F06-Q3** When a guessed edge's target is later read, should a re-read of the importer clear `guessed`? Today the edge is kept as it was (R10: one edge per pair). Proposed: yes. Not blocking.

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Added `Edit.newString` as a source, importer-family ordering and the TypeScript `.js` convention, Python absolute imports limited to existing nodes, path aliases ignored, deduplication, and a decision on guessed edges.
- 2026-10-13 Languages as one entry each, TypeScript (with JavaScript) and Python first (R2 reworded, R11, AC11). The `importEdges` setting (R12, AC12, F14 row). F06-AC5's result is derived: a `Read` cannot return 300,000 characters. Manual check covers Python and the setting.
- 2026-10-13 Approved by the owner. F06-Q2 stays open, not blocking.
- 2026-10-13 R6 clarified during F06-04: "already a node" means a node other than a ghost, so a repeat import of a guess stays `guessed` (user story 5). F06-Q3 opened.
- 2026-10-13 R3 after the branch review: `.js` tries `.tsx` after `.ts` (as TypeScript resolves it), the `.jsx`, `.mjs` and `.cjs` twins named, an extension of no language (`./styles.css`) links only to an existing node instead of guessing `styles.css.ts`, and a candidate outside the working directory stays absolute instead of being dropped. A language entry has no name.
