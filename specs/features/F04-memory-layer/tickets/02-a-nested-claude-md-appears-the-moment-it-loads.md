# 02: A nested CLAUDE.md appears the moment it loads

**What to build:** When Claude reads in `src/auth/`, `src/auth/CLAUDE.md` shows up in the list's Memory section in the middle of the turn, saying "nested" and "≈?". The project `CLAUDE.md` loaded at start is there too, saying "at start".

On `classic.InstructionsLoaded` the mod adds the note for `file_path` (normalized by I4), or updates it if one is there already. The note has `type` from `memory_type`, `tokens: null` and a `reason` mapped from `load_reason`: `session_start` → "at start", `nested_traversal` → "nested", `path_glob_match` → "path rule", `include` → "import", `compact` → "after compaction". The note goes into its own `memory` key, through one `update`. Memory notes never become file nodes, and the meter does not count them (I1).

The list view gets a Memory section under Files. Each row shows type, path and "≈tokens" (or "≈?"), and the section has a total ("≈?" counts as unknown, as the meter does). `/clear`, resume and fork empty `memory` (F03-R7).

Tests raise the recorded `classic.InstructionsLoaded` rows from `fixtures/sessions/reference.ts`.

Requirements: F04-R3, F04-R4.

**Blocked by:** None (can start immediately)

**Touches:** `register.tsx` (a new hook, reset), a memory reducer, the list renderer. Ticket 03 writes the same key, so merge this first.

**Status:** ready-for-agent

- [ ] F04-AC4 with cwd `/w`, `/w/src/auth/CLAUDE.md`, `Project`, `nested_traversal`: `memory` holds `src/auth/CLAUDE.md`, `Project`, "nested", `tokens: null`, before any refresh
- [ ] F04-AC5 `CLAUDE.md` as a memory note and read with `Read`: both a note and a file node, and the meter counts it once
- [ ] A second load of the same file updates its note and does not add another
- [ ] Each of the five `load_reason` values gives its reason word
- [ ] The Memory section shows type, path, "≈?" and the total; an empty `memory` shows no rows
- [ ] `/clear` empties `memory`
- [ ] Every case returns what the handler beneath returned
- [ ] The check command passes
