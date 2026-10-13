# 12: Header and legend in words

**What to build:** The graph view reads like an instrument. The view keys row is led by "CC Graph" in bold and "what Claude knows" dimmed. Under it the meter line shows a 16-segment bar of the context window, then `6% of 1M  ≈2.6k tokens · 7 files · 2 compacted · 2 changed unseen`, numbers bright, words dimmed, the unseen count in red. Under the card, two legend lines name only what is on screen: the shapes with their words (`● in context  ◐ partly read …`), then the rings in their colours and the memory files by path. Lines wider than the pane end in "…". The list view's header stays as F08 draws it.

Requirements: F09-R11, R20, R21.

**Blocked by:** 08

**Touches:** `render` (meter line, legend lines), the `ui.render` hook (title in the keys row, the row budget).

**Status:** done

- [x] F09-AC22 3 `read` files of 100 tokens, 1 `compacted`, 1 `blind`, fill 6% of 1,000,000: the meter line reads `━━━━━━━━━━━━━━━━ 6% of 1M  ≈300 tokens · 3 files · 1 compacted · 1 changed unseen`, first `━` in `#7aa7ff`, `1 changed unseen` in `#ff6b72`
- [x] F09-AC23 after step 8 with `blindSpots` and `decisions` off: `● in context  ◐ partly read  ◌ search hits only`, then `rings  edited · created  memory  CLAUDE.md · src/auth/CLAUDE.md`; no `○`, `!`, `✕`, `◆` or `changed` (replaces the AC8 test)
- [x] Without a fill percent the meter says "window –" and draws no bar
- [x] At 64 columns the meter line ends in "…" and the keys stay pressable
- [x] F09-AC4 and AC7 count the new rows
- [x] The check command passes
