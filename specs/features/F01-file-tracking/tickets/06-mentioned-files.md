# 06: @-mentioned files

**What to build:** Files the person `@`-mentions count as read, because Claude was given them: `read`, "mentioned by you", or `partial`, "lines 10 to 20, mentioned by you" for a ranged mention. A mentioned PDF that was not attached becomes a `ghost`, "mentioned PDF, not attached". A mention that resolves to nothing changes nothing. The hook reads the result after `next(e)` resolves and returns it unchanged.

Requirements: F01-R7, F01-R9, F01-R10, F01-R11.

**Blocked by:** 02 Text Read becomes a node

**Status:** done

- [x] F01-AC9 `@src/b.ts` is `read`, "mentioned by you", `tokens: null`
- [x] F01-AC15 `@src/b.ts#L10-20` with offset 10, limit 11 is `partial`, "lines 10 to 20, mentioned by you"
- [x] F01-AC16 a `pdf_reference` mention is a `ghost` and the meter is unchanged
- [x] A mention that resolves `null` leaves the graph unchanged
- [x] The check command passes
