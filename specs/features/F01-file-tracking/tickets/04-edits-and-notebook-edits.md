# 04: Edits and notebook edits

**What to build:** A file Claude edits gets the `edited` badge with running `+added −removed` counts taken from the patch that was written, not from `old_string`/`new_string`, so `replace_all` and edits the person changed in the permission dialog count correctly. `line` points at the first hunk. An edited file keeps its read state; a file with no node starts `partial`, "only the edited lines". Notebook edits count the lines of the new and old source. Staged edits and notebook edits with an error change nothing.

Requirements: F01-R4, F01-R5, F01-R8.

**Blocked by:** 02 Text Read becomes a node

**Status:** ready-for-agent

- [ ] F01-AC4 a `read` node stays `read`, `edited`, +3 −1
- [ ] F01-AC14 `replace_all` with three one-line hunks gives +3 −3
- [ ] A staged `Edit` and a `NotebookEdit` with `error` leave the graph unchanged
- [ ] The check command passes
