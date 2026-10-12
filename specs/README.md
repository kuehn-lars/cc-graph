# Specs

The specs are the source of truth for CC Graph. Code follows them, never the reverse: when the code shows a spec is wrong, the spec changes first, then the tests, then the code.

Each spec lives in its own folder as `spec.md`, so the evidence it gathers (spike notes, captured tool output, screenshots for the manual check) sits next to it.

## Index

### Foundation

| Spec | Owns | Changes when |
| --- | --- | --- |
| [00 Product](00-product/spec.md) | Problem, users, user stories, goals, principles, glossary, risks | Scope changes |
| [01 Architecture](01-architecture/spec.md) | Module boundaries, data flow, decisions, Mods API surface, testing strategy, CI, release | A module, event or decision changes |
| [02 Data model](02-data-model/spec.md) | Entities, `$.state` contract, node states, transitions, invariants | Any field, state or invariant changes |
| [03 Non-functional requirements](03-nfr/spec.md) | Performance, privacy, robustness, compatibility, accessibility | A limit or target changes |
| [04 Reference session](04-reference-session/spec.md) | The sample project, the scripted session every check replays, its expected graph | The story or a feature's visible result changes |

### Features

| ID | Feature | Milestone | Status |
| --- | --- | --- | --- |
| [F01](features/F01-file-tracking/spec.md) | File tracking: reads, edits, writes, mentions | v0.1 | Approved |
| [F02](features/F02-search-tracking/spec.md) | Search-only tracking | v0.1 | Approved |
| [F03](features/F03-context-layer/spec.md) | Context layer: compaction, fill, reset | v0.1 | Review |
| [F04](features/F04-memory-layer/spec.md) | Memory layer | v0.1 | Approved |
| [F05](features/F05-thinking-layer/spec.md) | Thinking layer | v0.4 | Review |
| [F06](features/F06-import-edges/spec.md) | Import edges | v0.2 | Review |
| [F07](features/F07-blind-spots/spec.md) | Blind spots | v0.3 | Review |
| [F08](features/F08-pane-list-view/spec.md) | Pane, list view and key map | v0.1 | Approved |
| [F09](features/F09-terminal-graph/spec.md) | Terminal graph and layout | v0.2 | Review |
| [F10](features/F10-desktop-graph/spec.md) | Desktop graph and pointer selection | v0.5 | Review |
| [F11](features/F11-detail-card/spec.md) | Detail card and actions | v0.4 | Review |
| [F12](features/F12-decisions/spec.md) | Decisions (opt-in) | v0.6 | Review |
| [F13](features/F13-timeline/spec.md) | Timeline | v0.6 | Review |
| [F14](features/F14-settings/spec.md) | Settings | v0.1 | Approved |
| [F15](features/F15-subagents/spec.md) | Subagent attribution | v0.1 | Approved |

When and in which order they ship: [ROADMAP.md](../ROADMAP.md).

## Lifecycle

| Status | Meaning | Who moves it there |
| --- | --- | --- |
| Draft | Being written. Not yet checked against the Mods API types | Anyone |
| Review | Complete, and every API claim checked against the types of the version in its header. Open questions are listed with the spike that answers them | The spec's author |
| Approved | No open question left that a requirement depends on. Tests may be written | The owner |
| Implemented | Every acceptance criterion has a passing test, the checks pass, the manual check is done | The implementer, with the owner for the manual check |
| Verified | CI is green on `main`, the trace check passes, and CHANGELOG names the change | CI |

Code for a requirement waits until its spec is Approved. A spec that changes after Approved goes back to Review, and its changelog says why.

## Writing a spec

Copy [`features/_template/spec.md`](features/_template/spec.md) into a new folder `features/Fxx-short-name/`. The template explains every section.

Conventions:

- **Requirements** use EARS sentence patterns, so each one names its trigger and is testable on its own: "When ‹trigger›, the mod ‹response›", "While ‹state›, the mod ‹response›", "If ‹unwanted condition›, then the mod ‹response›", or "The mod ‹response›" for one that always holds.
- **Acceptance criteria** use Given/When/Then and name concrete values: paths, counts, strings.
- **API claims** name the exact event, method, field and value as the generated types spell them (`session.compact`, `result.file.truncatedByTokenCap`), and the header records the Claude Code version they were checked against.
- **Implementation decisions** name layers and interfaces (`parse`, `model`, `layout`, `render`, the wiring module), not file paths, since paths go stale.
- **Words** follow the glossary in [00 Product](00-product/spec.md#glossary).

## IDs

| Kind | Form | Example |
| --- | --- | --- |
| Requirement | `Fxx-Rn` | `F03-R2` |
| Acceptance criterion | `Fxx-ACn` | `F03-AC4` |
| Open question | `Fxx-Qn`, or `ARCH-Qn`, `REL-Qn`, `UX-Qn` for cross-cutting ones | `F05-Q1` |
| Non-functional requirement | `NFR-<area><n>` (`P` performance, `S` privacy and security, `R` robustness, `C` compatibility, `A` accessibility) | `NFR-P1` |
| Invariant | `In` | `I4` |
| Principle | `Pn` | `P1` |
| Decision | `Dn` | `D5` |
| Reference-session checkpoint | `RS-n` | `RS-3` |
| Spike | `Sn` (in the roadmap) | `S1` |

An ID is never reused. Once a spec is Approved its IDs are frozen: a dropped requirement is struck through and kept, and a new one takes the next free number. An answered question stays in its spec, checked, with its answer. Every open question says whether it blocks: one a requirement depends on keeps the spec at Review; one that does not (a release check, a later product choice) may stay open after Approved.

## Traceability

- Every test name starts with the ID it proves: `test('F03-AC4 a compacted node read whole again is read', …)`, `test('NFR-P1 …')`, `test('RS-5 …')`.
- `node scripts/trace.mjs --check` matches criteria against test names and fails when a required one has no test. Required: every `Fxx-ACn` of a feature spec at Implemented or Verified, and every `NFR-*` and `RS-n` whose milestone (the NFR's "From", the checkpoint's milestone in 04) is at or below the `version` in `plugin.json`. Criteria of Approved specs that are not yet required are listed as pending.
- Commits name what they implement: `feat(F03): compaction state (F03-AC1..AC4)`. Spec-only commits use `spec(F03): …`.
