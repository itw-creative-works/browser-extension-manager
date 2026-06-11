# CLI

`npx bxm <command>` — aliases `xm`, `ext`, `mgr`, `browser-extension-manager`.

## Commands

| Command | Aliases | Purpose |
|---|---|---|
| `setup` | `-s`, `--setup` | Scaffold a consumer project (copy `src/defaults/`, install peer deps, write projectScripts). Default when no command given. |
| `clean` | `-c`, `--clean` | Remove `dist/`, `packaged/`, `.cache/`, `.temp/` |
| `install` | `-i`, `i`, `--install` | Install peer deps (gulp, etc.) |
| `test` | `-t`, `--test` | Run framework + project test suites. Positional target scopes by source + path (`project:` / `mgr:` / bare path); `--filter` matches test names; `--extended` enables real-external-API tests. See [test-framework.md](test-framework.md). |
| `version` | `-v`, `--version` | Print BXM, Node, peer-dep versions |

## Entry point

[bin/browser-extension-manager](../bin/browser-extension-manager) — yargs-based shim that loads [src/cli.js](../src/cli.js).

[src/cli.js](../src/cli.js) is the alias resolver: it maps short flags and positional args to a command module under [src/commands/](../src/commands/), then invokes it with the parsed options.

## Adding a new command

1. Create `src/commands/<name>.js` exporting `async function (options) { /* ... */ }`
2. Add to `ALIASES` in [src/cli.js](../src/cli.js):
   ```js
   const ALIASES = {
     clean:   ['-c', '--clean'],
     setup:   ['-s', '--setup'],
     <name>:  ['-x', '--<name>'],
   };
   ```
3. Optionally add to `projectScripts` in [package.json](../package.json) so consumers get a wrapper npm script on `npx bxm setup`.
4. Document under this page.

## Command options

Yargs parses `--foo bar` and `--foo=bar` into `options.foo`. Positional args go into `options._[]`. Each command reads what it needs:

```js
// src/commands/test.js
module.exports = async function (options) {
  const layer    = options.layer    || 'all';
  const target   = (options._ && options._[1]) || null; // positional: `npx bxm test <target>`
  const filter   = options.filter   || null;
  const reporter = options.reporter || 'pretty';
  // ...
};
```

## Env var conventions

Commands read BXM-prefixed env vars for behavior switches (one exception: `TEST_EXTENDED_MODE` is deliberately unprefixed — the SAME name across BEM/BXM/UJM/EM):

| Env | Used by | Purpose |
|---|---|---|
| `BXM_BUILD_MODE=true` | gulp tasks | Production build mode |
| `BXM_IS_PUBLISH=true` | gulp/package | Also publish to extension stores after packaging |
| `BXM_LOG_FILE` | gulp + test runners | Override the stdout/stderr tee path, or `false` to disable (see [logging.md](logging.md)) |
| `BXM_TEST_MODE=true` | test runners | Powers `Manager.isTesting()` (auto-set by `npx bxm test`) |
| `TEST_EXTENDED_MODE=true` | test runners | Run tests that hit REAL external services (`--extended` is the CLI shorthand; see [test-framework.md](test-framework.md)) |
| `BXM_TEST_BOOT_PROJECT` | test/boot | Override project root for boot tests |
| `BXM_TEST_BOOT_DIR` | test/boot | Override extension dir directly |
| `BXM_TEST_DEBUG=1` | test runners | Pipe Chromium stderr to console |
| `BXM_LIVERELOAD_PORT` | gulp/serve | WebSocket port (default 35729) |

## See also

- [build-system.md](build-system.md) — `gulp` is what most CLI commands ultimately invoke
- [test-framework.md](test-framework.md) — `npx bxm test` command surface
- [defaults.md](defaults.md) — `npx bxm setup` invokes the defaults task
