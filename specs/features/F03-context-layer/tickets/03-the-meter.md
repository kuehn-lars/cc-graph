# 03: The meter: estimated files next to the real window fill

**What to build:** The top of the list view says how much of the window the files account for, next to what the window really holds: "≈12.4k in 7 files (+2 unknown) · window 41% of 200k". Until Claude Code reports a fill, the window part reads "window –". Where nothing draws, `/graph`'s text summary starts with the same line.

This ticket adds a `session.measure` hook in the wiring. It awaits `next(e)`. When `changed` includes `context`, it writes `fill` = `{ tokens, window, percent }` from `e.context`, `null` for each figure that is absent. One pure function builds the meter line from the graph and `fill`. The list header (F08-R5) and the text summary both call it.

- **Left part (I1):** sum `tokens` over `mainLoop` nodes in the in-context group (`read`, `partial`, `search`). "in N files" counts the nodes with a known size. "(+M unknown)" counts those with `tokens: null`, never summed as zero, and is left out when M is 0.
- **Right part:** "window P% of Wk" from `fill`, and "window –" while `fill` is `null`.

Two things the spec leaves open. Settle them with the owner before green, and put the answer in the spec (`spec(F03): …`):

- **Number format:** how a count reads below 1,000 and at round thousands (the spec's examples are "12.4k" and "200k");
- **Absent percent:** what the window part reads when a fill is reported without `percent`. The proposal is "window –".

The meter's wording is asserted through `$.ui.mount` on the list view (Testing decisions). Fill tests raise `$.session.measure({ context, rateLimits: [], changed: ['context'] })`.

Requirements: F03-R4, F03-R5, F03-R6, F03-R9.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The two open wording points are settled in the spec
- [ ] F03-AC5 `tokens: 82000`, `window: 200000`, `percent: 41` give "window 41% of 200k"
- [ ] F03-AC12 with no measurement, the window part reads "window –"
- [ ] F03-AC13 with no surface and no measurement, `/graph` answers a text whose first line is the meter line, ending "window –"
- [ ] The left part over a graph with known and unknown sizes, a `compacted` node and a `ghost` (neither counted)
- [ ] A measurement whose `changed` lacks `context` writes nothing, and the hook returns what the handler beneath returned
- [ ] If ticket 04 has landed: its reset also empties `fill`
- [ ] The check command passes
