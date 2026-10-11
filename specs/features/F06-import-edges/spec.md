# F06 Import edges

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Review | v0.2 | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | F01, F09 |

## Problem

A list of files says what Claude saw, not how those files hang together. Without edges, nobody can see that the file Claude just edited is imported by three others, or that Claude read a module but none of what it depends on.

## Solution

Files are linked by their imports, found only in text that Claude's own tool results already carried. Imported files Claude never opened appear as faint ghosts at the end of an edge, so the graph shows the neighbourhood of what Claude touched without reading a single file itself.

## User stories

1. As a developer, I want import edges between the files Claude touched, so that I see how its reading list hangs together.
2. As a developer, I want imported files Claude never opened shown as ghosts, so that I see what it skipped.
3. As a privacy-minded developer, I want edges built only from text Claude already saw, so that the mod never reads my files.
4. As a developer, I want package imports ignored, so that the graph shows my code, not `node_modules`.
5. As a developer, I want an edge whose target file the mod could not confirm marked as guessed, so that I know when the graph is inferring.

## Requirements

- **F06-R1** When a text `Read` succeeds, the mod parses imports from `result.file.content`; when a `Write` succeeds, from `result.content`; when an `Edit` succeeds, from `result.newString`.
- **F06-R2** The mod recognizes, in JavaScript and TypeScript files, `import … from 'x'`, `import 'x'`, `export … from 'x'`, `require('x')` and `import('x')`; and in Python files, `from .x import y`, `from . import x`, `from ..x import y`, `import a.b` and `from a.b import c`.
- **F06-R3** The mod resolves a relative JavaScript or TypeScript specifier (`./`, `../`) against the importing file's folder, trying in order: the path as written, when it already ends in a known extension; the path with each extension of the importer's own family (`.ts`, `.tsx`, `.mts`, `.cts` for TypeScript; `.js`, `.jsx`, `.mjs`, `.cjs` for JavaScript), then of the other family; then `/index` with the same extensions. A TypeScript importer's specifier ending in `.js` tries the matching TypeScript file before the path as written.
- **F06-R4** The mod resolves a relative Python module against the importing file's package (one level up per extra dot) as `x.py`, then `x/__init__.py`. An absolute Python module (`a.b`) resolves against the working directory as `a/b.py` or `a/b/__init__.py`, and only to a node that already exists.
- **F06-R5** The mod ignores bare specifiers: packages, `node:` built-ins, and path aliases such as `@/lib/x`.
- **F06-R6** When a candidate is already a node, the mod links to it. Otherwise it links to the first candidate and marks the edge `guessed`.
- **F06-R7** When a target has no node, the mod adds it as a `ghost` (I3).
- **F06-R8** The mod never reads a file to find edges: the text comes only from Claude's own tool results (D6, NFR-S1).
- **F06-R9** If the text is longer than 200,000 characters, then the mod parses nothing from it.
- **F06-R10** The mod keeps one edge per pair of files and kind, ignores a file importing itself, and never removes an import edge.

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

## Implementation decisions

- **Two pure functions in `parse`.** `importsIn(text, path)` returns specifiers by the file's language; `candidatesFor(specifier, importer, workingDir)` returns ordered candidate paths. The reducer picks a candidate by the existing nodes, so resolution never needs the file system.
- **The importer's family goes first.** Without reading the disk the mod cannot know which file exists, so it guesses in the order the importer's own language would resolve. In a TypeScript project that guess is almost always right, including the ESM habit of writing `./util.js` for `util.ts`.
- **Guessed edges look like any other.** The card says "(path guessed)"; drawing them differently would add a visual rule for a rare case. F07's `git grep` confirms edges in the reverse direction, by resolving each hit's specifier the same way.
- **Edges are never removed.** An edit's `newString` shows what was added, not the whole file, so the mod cannot tell that an import was deleted. A stale edge is less harmful than a missing one.

## Testing decisions

- **Secondary seam:** table-driven unit tests for `importsIn` and `candidatesFor` over JavaScript, TypeScript and Python snippets, including comments and strings that look like imports.
- **Primary seam:** event tests for ghost creation, the existing-node preference, deduplication and the size limit (F06-AC1, AC5, AC6, AC10), with recorded `Read`, `Write` and `Edit` results.

## Mods API used

| Need | Event or method |
| --- | --- |
| Source text | F01's `tool.call` results: `Read` `file.content`, `Write` `content`, `Edit` `newString` |

## Data model changes

Adds `Edge` with `kind: 'import'` and `guessed`, and the `ghost` state for import targets.

## Manual check

1. In a copy of `fixtures/sample-app`, ask Claude to read `src/auth/login.ts`.
2. The graph shows edges to `password.ts` and `sessions.ts` as ghosts; the package import of `rate-limiter-flexible` in a later step adds nothing.

## Out of scope

- `tsconfig` path aliases, package `exports` maps, and Python packages installed outside the repository. They need configuration or the file system.
- Languages other than JavaScript, TypeScript and Python. The parser is the one place a new language would be added.
- Removing edges when an import is deleted.

## Open questions

- [x] **F06-Q1** Is a `guessed` edge worth drawing differently? Decided: no. It draws like any edge and the card says "(path guessed)" (see Implementation decisions).

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Added `Edit.newString` as a source, importer-family ordering and the TypeScript `.js` convention, Python absolute imports limited to existing nodes, path aliases ignored, deduplication, and a decision on guessed edges.
