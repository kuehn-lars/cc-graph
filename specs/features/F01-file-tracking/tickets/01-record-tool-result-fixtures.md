# 01: Record the F01 tool-result fixtures

**What to build:** Real tool results from a Claude Code session in a copy of the sample app, kept in the fixtures so every later F01 test answers with what a session actually returns. Nothing is typed by hand (CLAUDE.md, Tests). Recorded the same way as the S1 spike session, with a note on how to record them again.

The spec's Testing decisions list what is needed, plus the `pdf`, `parts` and `notebook` reads ticket 03 tests. The sample app has no image, PDF or notebook, and no file large enough to hit the token cap. Add those files to the temporary copy used for recording only, not to the sample app, so 04 Reference session stays as approved.

The session transcript keeps each call's `toolUseResult`, which is the result a `tool.call` hook sees (the transient `pages` of a `parts` result aside). A throwaway probe mod, as spike S1 used, works too.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A whole text `Read`, a ranged `Read` and a `Read` with `truncatedByTokenCap` are recorded
- [ ] An image `Read` and a `file_unchanged` answer are recorded
- [ ] A whole `pdf` `Read`, a `parts` `Read` of a page range, and a `notebook` `Read` are recorded
- [ ] An `Edit` with `replace_all` whose patch has several hunks is recorded
- [ ] A `Write` with `type: 'create'` and a `Write` that updates a file are recorded
- [ ] A successful `NotebookEdit` is recorded
- [ ] Each recording keeps its `tool_use_id`, its input and its result exactly as the session produced them
- [ ] The fixtures say how to record them again
