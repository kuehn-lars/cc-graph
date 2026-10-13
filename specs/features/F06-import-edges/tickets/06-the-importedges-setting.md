# 06: The importEdges setting

**What to build:** "Show file imports" appears in `/config`, on by default. With it off, reading `login.ts` adds `login.ts` alone: no edges, no ghosts, and no import parsing at all.

Add the `importEdges` field to `plugin.json` as F14-R1's table gives it (`boolean`, default `true`, title "Show file imports", with a description). The mod reads it once in `register` (F14-R2).

Requirements: F06-R12, F14-R1 (the `importEdges` row).

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] F06-AC12 `test(…, { options: { importEdges: false } }, …)`: the recorded read of `login.ts` leaves no edge, and no node for `password.ts` or `sessions.ts`
- [ ] With the default, the same read still makes the edges of F06-AC1
- [ ] `claude plugin validate --json .` reports nothing new (F14-AC3)
- [ ] The check command passes
