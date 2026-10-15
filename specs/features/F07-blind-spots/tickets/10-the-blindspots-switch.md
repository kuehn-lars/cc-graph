# 10: The blindSpots switch

**What to build:** `blindSpots` joins `userConfig` (F14-R1: boolean, default true, "Look for blind spots with git"). Off, the mod registers no `git` work: no shell changes, no import search, no Blind spots section. Shell reads stay.

Requirements: F07-R12; F14-R1, R2.

**Blocked by:** 02, 04, 06, 07

**Touches:** `plugin.json`, the wiring (registration by setting).

**Status:** ready-for-agent

- [ ] F07-AC26, F14-AC4
- [ ] `claude plugin validate` accepts the field
- [ ] The check command passes
