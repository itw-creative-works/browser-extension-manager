# Defaults System

`src/defaults/` is the starter template that BXM copies into consumer projects on first run (`npx bxm setup`). It mirrors a "fresh BXM project" — manifest, views, components, config, .nvmrc, .gitignore, .env, etc.

## How it works

1. During BXM's own build (`prepare-package`), files in `src/defaults/` are copied to `dist/defaults/`.
2. When a consumer runs `npx bxm setup`, the `gulp defaults` task copies files from `dist/defaults/` into the consumer's project root.
3. File behavior (overwrite, skip, template, rename) is controlled by `FILE_MAP` in [src/gulp/tasks/defaults.js](../src/gulp/tasks/defaults.js).

## FILE_MAP rules

```js
const FILE_MAP = {
  'src/**/*':       { overwrite: false },                  // never overwrite user code
  'hooks/**/*':     { overwrite: false },                  // never overwrite hooks
  '_.gitignore':    { name: () => '.gitignore' },          // rename on copy
  '_.env':          { name: () => '.env', overwrite: false },
  '.nvmrc':         { template: { node: '22' } },          // run templating against the source
  'package.json':   { skip: (cwd) => /* dynamic skip */ },
};
```

## Rule types

| Rule | Behavior |
|---|---|
| `overwrite: false` | Never replace if the file exists in the project. Default for `src/**`. |
| `overwrite: true` | Always overwrite — for files BXM owns (e.g. `.github/workflows/build.yml`). |
| `skip: function` | Dynamic skip — `(cwd) => boolean`. Skip in monorepo subdirs, etc. |
| `template: data` | Run the source through templating with `data` as the var bag, then write. |
| `name: function` | Rename on copy — typically used to add a leading `.` (`_.gitignore` → `.gitignore`). |

## Why the underscore prefix?

Files like `_.gitignore`, `_.env` are stored with a `_` prefix in `src/defaults/` so they don't interfere with BXM's own development (the framework repo doesn't want its `.env` overwritten by the template). The `name` rule renames them to the real `.foo` filename on copy.

## Adding a new default

1. Drop the file under `src/defaults/<path-where-it-goes-in-the-consumer>`
2. If it needs special handling, add an entry to `FILE_MAP` in [tasks/defaults.js](../src/gulp/tasks/defaults.js)
3. Run `npm run prepare` to refresh BXM's `dist/`
4. Verify in a fresh consumer project: `mkdir test-consumer && cd test-consumer && npm i ../browser-extension-manager && npx bxm setup`

## Why this exists

Consumers shouldn't have to hand-author boilerplate (manifest, sample views, sample SCSS, sample background.js, .nvmrc, .gitignore). The defaults system seeds a working extension in one command. Same idea as `create-react-app` or `vite create`, just integrated with BXM's CLI.

When BXM ships a framework improvement (e.g. a better default popup template), bumping BXM in a consumer + running `npx bxm setup` again pulls the improvements WITHOUT overwriting user changes (because most `src/**` entries are `overwrite: false`).

## See also

- [cli.md](cli.md) — `npx bxm setup` invokes the defaults task
- [build-system.md](build-system.md) — gulp tasks pipeline
