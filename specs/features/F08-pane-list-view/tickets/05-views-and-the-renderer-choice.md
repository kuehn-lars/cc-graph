# 05: Views and the renderer choice

**What to build:** The person picks the list or the graph with `/graph list`, `/graph graph`, or the `l` and `g` keys, and the pane opens the way they left it, also after a hot reload. `view` lives in `$.state`, so it outlasts the module's variables. The renderer is chosen by the element table `$.ui.resolve(e)` returned, never by surface name (D4): `Raster` gets the terminal graph (F09), else `Svg` gets the vector graph (F10), else the list. Neither graph has shipped, so every surface draws the list in v0.1, and `g` sets `view` without changing what is drawn (F08 key map).

The UI tests loop over `terminal`, `desktop`, `vscode` and `mobile` (NFR-C2), and between this ticket and 04 every v0.1 key in the key map is pressed (NFR-A2).

Requirements: F08-R2 (the argument), F08-R9 (`l`, `g`), F08-R10, F08-R11, NFR-C2.

**Blocked by:** 01 `/graph` opens the pane

**Status:** ready-for-agent

- [ ] F08-AC4 pressing `l` then `g` switches `view`, and the choice survives a second `session.start`
- [ ] F08-AC5 on `vscode` and `mobile`, with `view: 'graph'`, the list is drawn
- [ ] `/graph list` and `/graph graph` set `view`; any other argument leaves it (F08-R2; one test)
- [ ] NFR-C2 the pane draws without error on all four surfaces
- [ ] NFR-A2 `l` and `g` are pressed by a UI test
- [ ] The check command passes
