# 08: Selected row marker

**What to build:** The row whose path is `selected` begins with "▸ ", every other row with two spaces, so a press on a row (04) is visible before F11's card exists. The pane reads `selected` while drawing and hands it to the pure list renderer; the marker takes 2 columns of each row's budget (F08-R6, F08-R13). Found in the manual check of 07: pressing `3` changed nothing on screen.

Requirements: F08-R13, NFR-A1.

**Blocked by:** 04 Selecting a row

**Status:** ready-for-agent

- [ ] F08-AC11 after pressing `3` only the third row begins with "▸ "; pressing `1` moves it to the first
- [ ] F08-AC3 and F08-AC10 still hold with the marker's 2 columns counted
- [ ] The check command passes
