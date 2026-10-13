# 01: Record a session with mixed and Python imports

**What to build:** A real recording for the F06 cases the reference session does not cover, so no tool output is typed by hand. The reference session already has the `Read` of `src/auth/login.ts`, the `Write` of `src/middleware/rateLimit.ts` (with its `rate-limiter-flexible` import) and the `Edit` of `login.ts` that adds the `../middleware/rateLimit` import.

Record in a copy of `fixtures/sample-app` (git init and commit it there), with files added to the copy only, never to the sample app:

- `src/auth/password.js`: a small module, read **before** `login.ts` (F06-AC6).
- `src/a.ts` importing `./util.js`, with no `src/util.ts` in the copy (F06-AC7).
- `app/__init__.py`, `app/models.py`, and `app/views.py` with `from .models import User`, `from . import models` and `import app.models` (F06-AC3, R4).
- `docs/usage.md` showing `import { login } from '../src/auth/login'` in a fenced code block (F06-AC11).

One `claude -p` run whose prompt spells out the reads in order: `src/auth/password.js`, `src/auth/login.ts`, `src/a.ts`, `app/models.py`, `app/views.py`, `docs/usage.md`. Use a probe mod in the style of `fixtures/sessions/reference-probe` that logs `tool.call` input and the `next(e)` result. Write the fixture with a script beside `scripts/record-reference-session.mjs`, and add a section to `fixtures/sessions/README.md` with the command and every way the run differed from these steps. Check that no personal text got in.

**Blocked by:** None (can start immediately)

**Touches:** `fixtures/sessions/`, `scripts/`. No hook code, so it runs in parallel with 02.

**Status:** ready-for-agent

- [ ] The fixture recorded from a real run, nothing edited
- [ ] README section: how to record again, how the run differed
- [ ] No personal text in the fixture
- [ ] The check command passes
