# 02: Reading a TypeScript file links its relative imports to ghosts

**What to build:** When Claude reads `src/auth/login.ts`, the graph gains edges to `password.ts` and `sessions.ts`, both `ghost` nodes and both `guessed`. Package imports and path aliases add nothing.

This ticket lays down the per-language structure in `parse` (Implementation decisions, "One entry per language") with its first entry, TypeScript, which includes JavaScript files. `importsIn(text, path)` picks the entry by extension; `candidatesFor(specifier, importer, workingDir)` gives the ordered candidates of R3. In this ticket the reducer links to the first candidate and marks it `guessed`; ticket 04 adds the existing-node preference.

The `Read` action carries the imports, so the node, its edges and its ghosts land in one `update` of `graph` (I9). Ghosts and edges are subject to I3 and I5 as the existing eviction already handles them.

Requirements: F06-R1 (the `Read` part), R2 (TypeScript), R3 (first candidate only), R5, R7, R8, R10.

**Blocked by:** None (can start immediately)

**Touches:** `parse` (new import module), the `Read` action and its reducer, the `tool.call` wiring. Tickets 03 to 06 build on it, so merge it first.

**Status:** ready-for-agent

- [ ] F06-AC1 the recorded read of `login.ts`: edge to `src/auth/password.ts`, `guessed`, the target a `ghost`
- [ ] F06-AC2 `import React from 'react'`: no edge, no node (parse table)
- [ ] F06-AC4 no `$.fs` call (the existing `check-calls.mjs` step; a test named for it)
- [ ] F06-AC9 `import x from '@/lib/x'`: no edge, no node (parse table)
- [ ] F06-AC10 `login.ts` read twice: still one edge to `password.ts`
- [ ] TypeScript parse table: every R2 form, `node:` built-ins, imports inside comments and strings, a file importing itself
- [ ] Every case returns what the handler beneath returned, with one `update` of `graph` per call
- [ ] The check command passes
