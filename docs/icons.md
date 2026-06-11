# Icons

BXM generates every extension icon size from ONE consumer-supplied source image — drop a single file, the build derives the rest.

## Layout

```
<consumer>/config/icon.png        ← your ONE source icon (png or svg)
```

That's it. The `icons` gulp task picks up `config/icon.{png,svg}` and generates:

```
dist/assets/images/icons/icon.png          (original, converted to png)
dist/assets/images/icons/icon-1024x.png
dist/assets/images/icons/icon-512x.png
dist/assets/images/icons/icon-256x.png
dist/assets/images/icons/icon-128x.png
dist/assets/images/icons/icon-64x.png
dist/assets/images/icons/icon-48x.png
dist/assets/images/icons/icon-32x.png
dist/assets/images/icons/icon-24x.png
dist/assets/images/icons/icon-16x.png
```

## Where the sizes are used

- **Manifest** — BXM's manifest template wires the `icons` map to the generated paths (`assets/images/icons/icon-<size>x.png`), covering Chrome's required 16/32/48/128 plus the larger store sizes.
- **Store packaging** — the `package` task copies `icon-128x.png` into the store-assets directory for listing uploads.

## Sizes — ship ONE large source

Supply the source at the largest size you have (1024×1024 recommended) — generation resizes DOWN with quality 100 and strips metadata. Small sources are enlarged (`withoutEnlargement: false`), but upscaled icons look soft; start big.

## Watch behavior

In dev (`npm start`) the task watches `config/icon.*` and regenerates on change. In build mode the watcher is skipped — generation runs once in the pipeline.

## Source files

- [src/gulp/tasks/icons.js](../src/gulp/tasks/icons.js) — generation task (gulp-responsive-modern)
- [src/config/manifest.json](../src/config/manifest.json) — framework manifest wiring the `icons` map

## See also

- [build-system.md](build-system.md) — where the icons task runs in the pipeline
- [extension.md](extension.md) — cross-browser API + manifest reference
