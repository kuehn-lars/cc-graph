# 03: Rows fit the pane width

**What to build:** Narrow the pane and every row still fits on one line: nothing drawn is wider than `e.props.bodyColumns`. A path that does not fit is cut from its start and led by "…", so the file name stays readable; rows never wrap. Width is counted in terminal columns, not characters.

Requirements: F08-R6.

**Blocked by:** 02 File rows, newest first

**Status:** ready-for-agent

- [ ] F08-AC3 at `bodyColumns` 40, no drawn row is wider than 40 columns
- [ ] F08-AC10 at `bodyColumns` 30, the row for `src/middleware/rateLimit.ts` shows a path that starts with "…" and ends with `rateLimit.ts`
- [ ] The check command passes
