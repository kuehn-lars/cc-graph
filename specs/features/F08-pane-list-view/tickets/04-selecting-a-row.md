# 04: Selecting a row

**What to build:** Every file row is pressable by click, by Tab and Enter, and the first nine by `1` to `9`. A press writes the row's path to `selected`, ready for the card (F11). Each row is one plain `Button` keyed by its path, so selection needs no `Client` code. The press writes only the `selected` key, never `graph` (D3).

Requirements: F08-R8, F08-R9 (`1` to `9`).

**Blocked by:** 02 File rows, newest first

**Status:** ready-for-agent

- [ ] F08-AC6 pressing `3` sets `selected` to the third file row's path
- [ ] F08-AC9 pressing the row `Button` keyed `src/auth/login.ts` sets `selected` to `src/auth/login.ts`
- [ ] NFR-A2 each of `1` to `9` is pressed by a UI test
- [ ] The check command passes
