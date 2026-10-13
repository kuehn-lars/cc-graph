# 05: Python is the second entry, and unknown languages give nothing

**What to build:** Reading `app/views.py` links it to `app/models.py`. A file of a language the mod does not know, such as `docs/usage.md` showing an import in a code block, adds no edge. Adding Python touches only `parse`: if it needs a change in `model` or the wiring, the structure from ticket 02 is wrong, so fix that first.

Uses ticket 01's recording.

Requirements: F06-R2 (Python), R4, R11.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] F06-AC3 the recorded read of `app/views.py`: an edge to `app/models.py`
- [ ] F06-AC11 the recorded read of `docs/usage.md`: no edge, no node
- [ ] `import app.models` links only when `app/models.py` is already a node (R4)
- [ ] Python parse table: every R2 form, one level up per extra dot, `x.py` before `x/__init__.py`, imports inside comments and strings
- [ ] The check command passes
