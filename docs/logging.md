# Logging

BXM tees every line of CLI/pipeline output to log files in the consumer project root, so you can `tail -f` or `grep` a run instead of scrolling terminal scrollback. Runtime extension logs live in the browser's own consoles (service-worker console, popup/options DevTools) — this doc covers the file logs BXM itself writes.

## Log files

All in `<projectRoot>/logs/`:

| File | Source | Lifetime |
|---|---|---|
| `dev.log` | Gulp pipeline output on `npm start` | Truncated each run |
| `build.log` | Gulp pipeline output on `npm run build` (`BXM_BUILD_MODE=true`) | Truncated each run |
| `test.log` | `npx mgr test` runner output (suite names, pass/fail states, timings) | Truncated each run |

`dev.log` and `build.log` are the same gulp tee — which one it writes is chosen by `BXM_BUILD_MODE`, so they never both fill up in one run.

## What gets captured

Everything that flows through stdout/stderr: `Manager.logger(...)` output, raw `console.log` calls, gulp task names, webpack/sass output, the works. ANSI color codes are stripped from the file (grep-friendly); the terminal continues to receive colored output unchanged.

## Controls

| Var | Effect |
|---|---|
| `BXM_LOG_FILE=false` | Disable the tee entirely |
| `BXM_LOG_FILE=<path>` | Override the log file path |

Implementation: [src/utils/attach-log-file.js](../src/utils/attach-log-file.js), attached at the top of [src/gulp/main.js](../src/gulp/main.js) — same pattern as EM's `dev.log`/`build.log` and UJM's.

## See also

- [build-system.md](build-system.md) — the gulp pipeline that feeds `dev.log`/`build.log`
- [test-framework.md](test-framework.md) — the test runner that feeds `test.log`
