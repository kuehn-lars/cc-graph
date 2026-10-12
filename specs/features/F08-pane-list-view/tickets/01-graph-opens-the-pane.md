# 01: `/graph` opens the pane: the first full path

**What to build:** The person types `/graph` and a pane titled "CC Graph" opens beside the conversation, focused, closing on Esc, asking for 64 columns. The command answers "CC Graph opened.". On an empty graph the pane shows the Files section's empty line, "Nothing read yet.", on the terminal and on the desktop. When the dock has no room, a toast says why the pane is waiting.

This ticket builds the shape every later F08 ticket reuses: `/graph` registered at `session.start`, a `command.run` hook that opens the pane, and one `ui.render` hook that matches only this plugin's pane, reads state and hands the element table from `$.ui.resolve(e)` to a pure list renderer. It is the first UI code, so it adds the pure render folder CLAUDE.md names, and the first UI tests through `$.ui.mount`.

Pieces no other ticket provides, so this one adds them:
- **A second pane in the tests.** NFR-R4 needs a UI test with a second inline plugin drawing its own pane; this pane's matcher must leave it alone.
- **Sections not yet shipped.** Only the Files section is drawn. Memory (F04), Thinking (F05), Blind spots (F07), Decisions (F12), the meter (F03) and the footer notes (F14, F07) each arrive with their feature (F08-R5).

Requirements: F08-R1, F08-R2 (without the argument), F08-R3, F08-R7 (Files only), F08-R12, NFR-R4.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] F08-AC1 on `terminal` and `desktop`, `/graph` opens the pane and an empty graph shows "Nothing read yet."
- [ ] `/graph` is registered at `session.start` with `immediate: true`, its description and the hint `[list|graph]` (F08-R1; no AC of its own, one test)
- [ ] `$.ui.open` gets `id: 'cc-graph'`, the title, `focus`, `closeOnEscape` and `columns: 64`, and the command answers `{ text: 'CC Graph opened.' }` (F08-R2)
- [ ] F08-AC7 `isPlaced: false` with "needs 144 columns, has 100" shows the toast "CC Graph is waiting for room: needs 144 columns, has 100"
- [ ] NFR-R4 a second inline plugin's pane draws its own content beside this one
- [ ] The check command passes
