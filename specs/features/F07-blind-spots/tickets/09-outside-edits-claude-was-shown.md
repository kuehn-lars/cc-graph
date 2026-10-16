# 09: Outside edits Claude was shown

**What to build:** A main-loop `edited_text_file` attachment marks the file `external` with "changed outside Claude; Claude was shown it", or keeps Claude's change and sets that reason. It is never a blind spot.

F07-Q1 is open: no session has raised the attachment. The fixture is derived from the type and marked derived; read the path as spike S1 reads `file` attachments, falling back to matching known nodes.

Requirements: F07-R7.

**Blocked by:** None (can start immediately)

**Touches:** `parse` (attachment), `model`, the wiring (`prompt.attachment` with `type: 'edited_text_file'`).

**Status:** done

- [x] F07-AC6 (derived fixture)
- [x] The check command passes
