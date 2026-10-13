# 04: Existing nodes beat guesses

**What to build:** When a candidate for an import is already in the graph, the edge points there and is not `guessed`. A TypeScript file's `./util.js` is guessed as `util.ts` first, the ESM habit.

Uses ticket 01's recording: `src/auth/password.js` is read before `login.ts`, and `src/a.ts` imports `./util.js`.

Requirements: F06-R3 (the full order, including the `.js` rule), R6.

**Blocked by:** 01, 02

**Status:** done

- [x] F06-AC6 `password.js` already a node: the edge from `login.ts` points to `src/auth/password.js`, not `guessed`
- [x] F06-AC7 no nodes: `src/a.ts` importing `./util.js` points to `src/util.ts`, `guessed`
- [x] `candidatesFor` table: TypeScript and JavaScript importers, each family's order, `/index`, a specifier with an extension
- [x] The check command passes
