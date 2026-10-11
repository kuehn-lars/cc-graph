# Fxx Feature name

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Draft | v0.x | Lars Kühn (@kuehn-lars) | Claude Code 2.x.y | Fyy, Fzz |

## Problem

What the person cannot see or do today, from their side, in two to four sentences.

## Solution

What they can see or do once this ships, from their side. No events or modules here.

## User stories

1. As a ‹user from 00 Product›, I want ‹capability›, so that ‹benefit›.

## Requirements

One testable statement each, in an EARS pattern ("When ‹trigger›, the mod ‹response›", "While ‹state›, …", "If ‹unwanted condition›, then the mod …", or "The mod …").

- **Fxx-R1** When …, the mod …

## Acceptance criteria

One concrete example each, with real paths, counts and strings. Every criterion becomes at least one test named by its ID.

- **Fxx-AC1** Given …, when …, then …

## Implementation decisions

The layers this touches (`parse`, `model`, `layout`, `render`, wiring), the interfaces between them, and every choice a reader might otherwise question, with the reason. No file paths.

## Testing decisions

The seam each criterion is tested at (primary: the engine test kit; secondary: pure `parse` or `layout` functions), what the test stands in for beneath the plugin, and the fixtures it needs.

## Mods API used

Every event and method, spelled as the types spell it, checked against the version in the header.

| Need | Event or method |
| --- | --- |
|  |  |

## Data model changes

Fields, states or keys added or changed in [02 Data model](../../02-data-model/spec.md), or "None".

## Manual check

1. Run `claude --plugin-dir <this repository>` in a copy of `fixtures/sample-app` (see [04 Reference session](../../04-reference-session/spec.md)).
2. …

## Out of scope

What a reader might expect here that this feature deliberately does not do, and where it lives instead if anywhere.

## Open questions

Each with the spike or check that answers it, and whether it blocks (a requirement depends on it). A spec reaches Approved only with no blocking question left.

- [ ] **Fxx-Q1** …

## Changelog

- YYYY-MM-DD Draft.
