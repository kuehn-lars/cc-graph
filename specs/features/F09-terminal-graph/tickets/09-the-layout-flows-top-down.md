# 09: The layout flows top down

**What to build:** The force layout stops leaving nodes where their folder's hash put them. Importers settle at least 10 units above what they import, import edges pull toward 14 units, and a weak pull keeps a folder together. A new node starts 8 units below its most recently touched placed importer (or above what it imports, or at its folder's seed point), offset by a hash of its path, and moves freely in its first pass; only nodes with an earlier position keep R4's 2-unit cap. In a real session the reference turn reads top down: `routes/index.ts` above `login.ts` above `sessions.ts`.

This is pure `layout` work and lands independently of 08: positions keep their 100 × 64 canvas units, and the renderer reads them as before.

Requirements: F09-R4 (the cap applies to existing nodes only), R13.

**Blocked by:** None (can start immediately)

**Touches:** `layout` (forces, start point, the cap).

**Status:** done

- [x] F09-AC25 a new chain `index.ts` → `login.ts` → `sessions.ts`: after one pass each importer is at least 10 units above what it imports
- [x] F09-AC26 `login.ts` at (50, 30) and a new ghost `users.ts` importing it: after one pass `users.ts` is within 16 units of it
- [x] F09-AC1, AC2, AC3 and AC12 still pass
- [x] The check command passes
