# 01: Declare `maxNodes` and clamp it

**What to build:** `maxNodes` shows in `/config` as "Most files in the graph" with its description, default 60, `min` 20 and `max` 200 (F14-R1, v0.1 row only). `register` reads the value once from `options` and clamps it to 20..200 (F14-R2, R3). The clamped value is what the model uses as its cap, passed in as data; model code never reads `options`.

Red phase answers F14-Q1: write F14-AC5 with `test(name, { options: { maxNodes: 500 } }, …)` and see what the kit does. If the engine refuses the value before `register` runs, the test asserts that refusal, the clamp stays as defence, and F14-Q1 is closed in the spec with what was seen. If it passes through, assert the cap is 200.

Only `maxNodes` lands; the other F14 fields ship with their features.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] F14-AC3: `claude plugin validate --json .` reports no error and no warning about `userConfig` (the check command covers it)
- [ ] F14-AC5: test named `F14-AC5 …`, failing first, then passing
- [ ] F14-Q1 ticked in the spec with the observed engine behaviour
- [ ] The check command passes
