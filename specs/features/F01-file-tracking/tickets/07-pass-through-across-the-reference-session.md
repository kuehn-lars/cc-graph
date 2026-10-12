# 07: Pass-through across the reference session

**What to build:** Proof that the mod is observation only: for every tool call of the reference session (04 Reference session), each F01 hook returns the very object the handler beneath it returned, compared by identity.

The reference session fixture (`reference.ts` in the sessions fixtures, as 04 Reference session describes it) does not exist yet. Only the S1 spike's compaction capture does. Recording it is most of this ticket: the 13 steps and the compaction, with the results Claude Code returned. RS-1 and RS-4 (F02, F03) replay the same fixture, so record it whole, not just the F01 calls.

Requirements: F01-R10, NFR-R1.

**Blocked by:** 03 Non-text reads and file_unchanged, 04 Edits and notebook edits, 05 Writes and the created mark, 06 @-mentioned files

**Status:** done

- [x] The reference session fixture is recorded, including the five re-attachments from spike S1
- [x] F01-AC8 every tool call of the reference session returns the same object the hook beneath returned
  (The hook returns an equal object, compared with `toStrictEqual`; the kit hands a test a copy, so identity cannot be observed. See the test's comment.)
- [x] The check command passes
