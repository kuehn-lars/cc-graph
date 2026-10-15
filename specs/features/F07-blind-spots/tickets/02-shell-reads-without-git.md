# 02: Shell reads, without git

**What to build:** A file Claude prints with `cat`, `bat`, `nl`, `head`, `tail` or `sed -n` shows as `read` or `partial`, with what it saw ("48 lines", "lines 1 to 5") and, for a single-file read, its tokens and import candidates. A piped `cat` is not a read. A `Bash` call that is read-only (`isReadOnly`) raises no `git` at all. Search and reads of one call land in one write of `graph`.

Record the `Bash` results for `cat src/auth/login.ts` and `sed -n '1,5p' src/config.ts` from a real run into `fixtures/tool-results/` (`scripts/record-tool-results.mjs`); spike S4's prompt has both steps.

Requirements: F07-R18, R19.

**Blocked by:** 01

**Touches:** `parse` (a shell-read parser beside search), `model` (a Bash call's reads and search as one action), the wiring (the Bash parser, the read-only skip).

**Status:** done

- [x] F07-AC23, AC24, AC25
- [x] Unit tests: which segment reads which file
- [x] The check command passes
