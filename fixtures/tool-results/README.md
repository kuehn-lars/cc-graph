# Recorded tool results (F01)

Real `tool_use` + `toolUseResult` pairs from Claude Code 2.1.296 (Haiku, `claude -p`, 2026-10-12), one module per call, each `export default { tool, tool_use_id, input, result }`, exactly as the session transcript holds them. Nothing is edited, so paths are those of the recording copy (`/private/tmp/claude-501/rec-k0nL/sample-app/…`). They are `.ts` because a test can import only `.ts`/`.js` files.

| Module | Call |
| --- | --- |
| `read-whole` | `Read src/auth/login.ts`, no range (`type: 'text'`) |
| `read-ranged` | `Read src/routes/index.ts`, `offset: 1, limit: 40` (`numLines 40` of `totalLines 121`) |
| `read-token-capped` | `Read big.log` (2,500 lines): `truncatedByTokenCap: true`, `numLines 636` of `2501` |
| `read-image` | `Read logo.png` (`type: 'image'`) |
| `read-pdf` | `Read doc.pdf`, 3 pages (`type: 'pdf'`) |
| `read-pdf-parts` | `Read doc.pdf`, `pages: '1-2'` (`type: 'parts'`; no `pages` images, they are transient) |
| `read-notebook` | `Read notes.ipynb` (`type: 'notebook'`) |
| `edit-replace-all` | `Edit login.ts`, `users` to `accounts`, `replace_all`; `structuredPatch` has 3 hunks |
| `write-create` / `write-update` | `Write` a new `src/middleware/rateLimit.ts` / rewrite `src/api/users.ts` |
| `notebook-edit` | `NotebookEdit` replacing cell `calc` |

**Not recorded: `file_unchanged`.** In 2.1.296 a repeated `Read` of an unchanged file never answered it, in `claude -p` with Haiku and Sonnet: whole, `offset: 1`, ranged, and a memory file (`CLAUDE.md`), each read twice. The engine has a dedup kill switch (`tengu_read_dedup_killswitch`) that is probably on for this account. The shape from the engine's schema is `{ type: 'file_unchanged', file: { filePath }, source?: 'seeded' }`. `file-unchanged.ts` is therefore DERIVED from that type (the recorded `read-whole` call with the `file_unchanged` result), not recorded; its header says so and the tests that use it say so. Replace it with a recording once a build returns one.

## Record again

1. Copy `fixtures/sample-app` to a temporary folder and add what the sample app lacks (these files stay out of the sample app):
   - `logo.png`: any small PNG.
   - `big.log`: 2,500 lines, e.g. `line N: request handled by worker N%7 …`, about 180 KB. Over 256 KB the `Read` errors instead of truncating.
   - `notes.ipynb`: a notebook with a markdown cell `intro` and a code cell `calc`.
   - `doc.pdf`: 3 pages (`cupsfilter doc.txt > doc.pdf`). Page ranges need `pdftoppm` (`brew install poppler`).
2. `git init` and commit there.
3. `claude -p --model haiku --permission-mode acceptEdits "<steps>"` in the copy. One tool call per step, in order: `Read` login.ts whole, `Read` routes/index.ts `offset 1 limit 40`, `Read` big.log, `Read` logo.png, `Read` doc.pdf, `Read` doc.pdf `pages "1-2"`, `Read` notes.ipynb, `Edit` login.ts `users` to `accounts` with `replace_all`, `Read` then `Write` src/api/users.ts with one added line, `Write` a new src/middleware/rateLimit.ts, `NotebookEdit` cell `calc`.
4. Find the transcripts under `~/.claude/projects/<copy path with / as ->/*.jsonl` and run
   `node scripts/record-tool-results.mjs fixtures/tool-results <transcript.jsonl>…`.
