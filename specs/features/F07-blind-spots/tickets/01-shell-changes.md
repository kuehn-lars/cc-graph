# 01: Shell changes

**What to build:** Files a shell command created, deleted or changed show in the graph and the list. The mod finds the repository root once, keeps `git status` as a baseline (at `session.start`, each `turn.start` and after each `Bash` call), and after each `Bash` call writes what changed: `created` (untracked, added or renamed to), `deleted` (a `D`, renamed from, or an untracked file gone) or `blind` (anything else), each with "created by", "deleted by" or "changed by" and the command. Every `git` call runs off the hook's path. Outside a repository the footer says "Shell changes need git".

Pulled into v0.2 at the owner's request: in the F09 manual check, files Claude made with `printf >` and removed with `rm` were missing or still drawn as read.

Requirements: F07-R1, R5, R6, R8, R11.

**Blocked by:** None

**Touches:** `parse` (status), `model` (shellChanged), the wiring (git calls, the baseline).

**Status:** built, waiting for the owner's review of the spec and the manual check

- [x] F07-AC2, AC12 to AC15
- [x] The check command passes
