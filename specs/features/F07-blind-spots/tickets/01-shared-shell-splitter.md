# 01: Shared shell splitter

**What to build:** F02's command splitter (segments on `|`, `&&`, `||`, `;` and newlines; quotes; redirections; the `cd … &&` folder of F02-R8) moves out of the search parser into its own `parse` module, so shell reads (02) and named changes (05) can use it. No behaviour changes.

Requirements: None (prefactor for F07-R17, R19).

**Blocked by:** None (can start immediately)

**Touches:** `parse` (search, a new shell module).

**Status:** ready-for-agent

- [x] F02's tests pass unchanged
- [x] The check command passes
