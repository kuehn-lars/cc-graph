# 03: Writes and edits carry their imports, and big text is skipped

**What to build:** A file Claude writes or edits gets its import edges too: the `Edit` of `login.ts` that adds `../middleware/rateLimit` links to `src/middleware/rateLimit.ts`, and the `Write` of `rateLimit.ts` adds nothing for `rate-limiter-flexible`. Text over 200,000 characters, from any of the three sources, is not parsed.

Uses the reference session's `Write` and `Edit` rows. A `Read` over 256 KB errors instead of returning text, so F06-AC5's 300,000-character result is derived from a recorded text `Read`; the test name says "derived".

Requirements: F06-R1 (`Write` `content`, `Edit` `newString`), R9.

**Blocked by:** 02

**Status:** done

- [x] F06-AC8 the recorded `Edit` of `login.ts`: an edge to `src/middleware/rateLimit.ts`
- [x] F06-AC2 the recorded `Write` of `rateLimit.ts`: no edge and no node for `rate-limiter-flexible`
- [x] F06-AC5 (derived) a 300,000-character `Read` result: no edge
- [x] A `Write` or `Edit` over 200,000 characters: no edge
- [x] The check command passes
