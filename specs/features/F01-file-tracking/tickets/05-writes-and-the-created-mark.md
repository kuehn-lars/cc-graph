# 05: Writes and the created mark

**What to build:** A file Claude creates shows as `read`, `created +n`, "written by Claude", and keeps `created` through later edits, so new files stand out from changed ones (I2). A `Write` over an existing file marks it `edited` unless it is already `created`. Line counts come from the patch, or every line of the content for a create whose patch is empty; an empty update patch adds nothing. Staged writes change nothing.

Requirements: F01-R6, F01-R8.

**Blocked by:** 02 Text Read becomes a node, 04 Edits and notebook edits (F01-AC6 runs an Edit after a create)

**Status:** done

- [x] F01-AC5 a create `Write` of the recorded 14 lines is `read`, `created`, +14
- [x] F01-AC6 an `Edit` after the create keeps `created`
- [x] F01-AC13 a staged `Write` leaves the graph unchanged
- [x] An update `Write` with an empty patch adds no lines (F01-R6)
- [x] The check command passes
