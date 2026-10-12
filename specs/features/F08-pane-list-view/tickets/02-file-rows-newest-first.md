# 02: File rows, newest first

**What to build:** Every file in the graph is one row in the Files section: the state glyph, the path, the change badge and "≈tokens · seen", the most recently touched first. Glyphs and badges come from 02 Data model (`●` `◐` `◌` `○` `!` `⋯`; `edited +3 −1`, `created +12`, `external`, `blind`), so no state or change is told by color alone (NFR-A1). A node with `tokens: null` reads "≈?".

F08-AC2 needs `src/auth/password.ts` as `search`, and only F02 produces that state. Until F02 ships, the test seeds the graph as it stands after step 6 of the reference session (the test's own `state.get` hook beneath the mod, as `seedGraph` in the event tests' kit does for F01-AC12) and says it is derived (F08 Testing decisions). F02's tickets switch it to a replay of steps 1 to 6.

Requirements: F08-R5 (Files), NFR-A1.

**Blocked by:** 01 `/graph` opens the pane

**Status:** ready-for-agent

- [ ] F08-AC2 after steps 1 to 6 the Files section lists, top down, `● src/middleware/rateLimit.ts`, `● src/config.ts`, `● src/db/redis.ts`, `● src/auth/sessions.ts`, `◌ src/auth/password.ts`, `● src/auth/login.ts`, `◐ src/routes/index.ts` (seeded graph, marked derived)
- [ ] NFR-A1 each of the six states shows its glyph and each of the four changes its badge word
- [ ] A row reads "≈tokens · seen", and "≈?" when `tokens` is `null` (no AC of its own; one test)
- [ ] The check command passes
