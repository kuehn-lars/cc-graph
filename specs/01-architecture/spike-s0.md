# Spike S0: off-path work after the hook returned (ARCH-Q1)

Claude Code 2.1.296, 2026-10-11. Probe mod kept outside the repository (never merged).

## Probe

A hook schedules `$.clock.after(300, fn)` and returns. `fn` closes over the hook's own `$` (the types give it none: `TimerCall = (ms, fn: () => void) => Timer`), then calls `$.process.run(['git', 'rev-parse', '--show-toplevel'], { timeoutMs: 5000, env: { GIT_OPTIONAL_LOCKS: '0' } })`, then `update($, ref, fn)`, then `$.fs.write` to a log. Scheduled from `session.start` and from a `command.run` hook (`/probe`), in an interactive terminal session (`claude --plugin-dir`, 180 columns).

## Result

```text
{"s0":"session.start","firedAfterMs":335,"processRun":{"exitCode":0,"stdout":"/Users/lars/github/cc-graph"},"update":"ok"}
{"s0":"command.run","firedAfterMs":314,"processRun":{"exitCode":0,"stdout":"/Users/lars/github/cc-graph"},"update":"ok"}
```

- **Yes:** a `$.clock.after` callback may call `$.process.run` and write `$.state` through `update` after the hook that scheduled it returned, through that hook's `$`, from `session.start` and from `command.run`.
- **Yes, it redraws:** the pane, opened by `/probe`, first drew `probe root: session.start at 2026-10-11T15:01:13.156Z: …`. When the `command.run` callback's `update` landed (logged at 15:01:27.258), the terminal repainted the changed cells in place, `command·run at 20·6-10-11T·5:01:27.258Z` in the flushed pty capture (`script -F`). No `$.ui.invalidate` was needed.

- **Also from `tool.call`, headless:** in spike S1's set-up A (`claude -p`), callbacks scheduled by `tool.call` hooks ran `git` (exit 0) and wrote state through `update` after their hooks returned, for five `Read` calls, a `Write` and an `Edit`.

Side finding: `validate` recognises a `$.state` contract only when the `.d.ts` exports a type. A file with only `export {}` reports the key as not declared.
