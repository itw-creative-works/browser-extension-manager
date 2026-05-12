# Build Hooks

Two lifecycle hooks let consumers run custom logic during the build pipeline.

## Hook files

| Hook | Source | When |
|---|---|---|
| `build:pre` | `hooks/build:pre.js` (in consumer project) | Before packaging — after `dist/` is built but before `packaged/` is assembled |
| `build:post` | `hooks/build:post.js` | After packaging — `packaged/<browser>/raw/` and `.zip` exist |

Hooks are optional — `gulp/tasks/package.js` checks for the file's presence and runs it if present.

## Hook shape

```js
// hooks/build:pre.js
module.exports = async function (index) {
  // index contains build info — package, manifest, config, paths
  console.log('Pre-build hook running for', index.brand.name);

  // Mutate files, generate assets, validate, anything you want.
  // Return a Promise (or use async fn) to make the build wait.
};
```

## The `index` argument

The hook receives a build-info object with:

- `index.package` — parsed `package.json`
- `index.manifest` — parsed `src/manifest.json` (JSON5)
- `index.config` — parsed `config/browser-extension-manager.json`
- `index.brand` — shorthand for `index.config.brand`
- `index.paths` — `{ root, src, dist, packaged }` absolute paths
- `index.env` — `'production'` or `'development'`
- `index.browsers` — array of browser targets being built (`['chromium', 'firefox', 'opera']`)

## Common uses

### Sync a CHANGELOG version into the manifest

```js
// hooks/build:pre.js
const fs = require('fs');
const path = require('path');

module.exports = async function (index) {
  const changelog = fs.readFileSync(path.join(index.paths.root, 'CHANGELOG.md'), 'utf8');
  const latestVersion = changelog.match(/## \[([\d.]+)\]/)?.[1];
  if (latestVersion && latestVersion !== index.manifest.version) {
    console.warn(`Manifest version (${index.manifest.version}) doesn't match CHANGELOG latest (${latestVersion})`);
  }
};
```

### Inject a build timestamp

```js
// hooks/build:pre.js
const fs = require('fs');
const path = require('path');

module.exports = async function (index) {
  const buildInfo = {
    builtAt: new Date().toISOString(),
    gitSha: require('child_process').execSync('git rev-parse HEAD').toString().trim(),
  };
  fs.writeFileSync(path.join(index.paths.dist, 'build-info.json'), JSON.stringify(buildInfo, null, 2));
};
```

### Trigger a post-publish webhook

```js
// hooks/build:post.js
module.exports = async function (index) {
  if (process.env.BXM_IS_PUBLISH !== 'true') return;   // only after real publish
  await fetch('https://api.myservice.com/extension-released', {
    method: 'POST',
    body: JSON.stringify({ version: index.manifest.version }),
  });
};
```

## Async by default

Hooks are awaited — the build waits for them to resolve before continuing. Throw or reject to fail the build (and abort packaging / publishing).

## Where hooks are invoked

[src/gulp/tasks/package.js](../src/gulp/tasks/package.js) loads and runs them. Search for `runHook` in that file to see the exact wiring.

## Why not just edit gulp tasks?

You COULD fork BXM's gulp tasks for any custom build behavior. Hooks exist so consumers don't need to. Hooks are stable contract (the `index` object shape doesn't change), survive BXM upgrades, and live in the consumer's repo (where build-specific concerns belong).

## See also

- [build-system.md](build-system.md) — gulp pipeline details
- [publishing.md](publishing.md) — store auto-publishing happens AFTER `build:post`
