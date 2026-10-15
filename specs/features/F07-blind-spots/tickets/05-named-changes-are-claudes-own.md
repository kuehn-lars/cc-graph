# 05: Named changes are Claude's own

**What to build:** A file a command names and changes (`sed -i … src/config.ts`, `printf >> src/db/redis.ts`, `cat > src/new.ts`, `rm -rf tickets/`) is Claude's own edit: `edited` with "changed by `<command>`", not `blind`, and not a blind spot. A file the command never named (`package.json` under `npm pkg set`) stays `blind`. An `edited` node without counted lines shows "edited", not "+0 −0". Capture the ` M src/db/redis.ts` status from a copy of the sample app.

Requirements: F07-R17.

**Blocked by:** 01

**Touches:** `parse` (status: named paths), `model` (shellChanged), `render` (palette: edited without counts).

**Status:** ready-for-agent

- [x] F07-AC22
- [x] The check command passes
