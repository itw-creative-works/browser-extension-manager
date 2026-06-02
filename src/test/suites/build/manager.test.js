// Build-layer tests for Manager.getConfig() / getManifest() / getPackage() / getEnvironment().
// Stages a temp project dir with config/browser-extension-manager.json + src/manifest.json
// + package.json, sets process.cwd() to it, then exercises Manager's getters.

const path    = require('path');
const fs      = require('fs');
const os      = require('os');

function stageProject(opts = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bxm-getconfig-'));
  if (opts.config !== undefined) {
    fs.mkdirSync(path.join(tmp, 'config'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'config', 'browser-extension-manager.json'), opts.config);
  }
  if (opts.manifest !== undefined) {
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'src', 'manifest.json'), opts.manifest);
  }
  if (opts.pkg !== undefined) {
    fs.writeFileSync(path.join(tmp, 'package.json'), opts.pkg);
  }
  return tmp;
}

// Runs `fn` with process.cwd() pinned to `dir`. Manager.getConfig() / getManifest()
// resolve their files against process.cwd() at CALL time, so we hold the chdir until
// after the test body runs (not just during require()).
function inDir(dir, fn) {
  const oldCwd = process.cwd();
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/build.js')) delete require.cache[k];
  }
  try {
    process.chdir(dir);
    return fn(require(path.join(__dirname, '..', '..', '..', 'build.js')));
  } finally {
    process.chdir(oldCwd);
  }
}

module.exports = {
  type: 'suite',
  layer: 'build',
  description: 'Manager — config / manifest / package / environment getters',
  tests: [
    {
      name: 'getConfig returns parsed JSON5',
      run: (ctx) => {
        const tmp = stageProject({ config: `{ brand: { id: 'somiibo', name: 'Somiibo' } }` });
        try {
          inDir(tmp, (Manager) => {
            const cfg = Manager.getConfig();
            ctx.expect(cfg.brand.id).toBe('somiibo');
            ctx.expect(cfg.brand.name).toBe('Somiibo');
          });
        } finally {
          fs.rmSync(tmp, { recursive: true, force: true });
        }
      },
    },
    {
      name: 'getManifest returns parsed JSON5 from src/manifest.json',
      run: (ctx) => {
        const tmp = stageProject({ manifest: `{ manifest_version: 3, name: 'Test', version: '1.0.0' }` });
        try {
          inDir(tmp, (Manager) => {
            const m = Manager.getManifest();
            ctx.expect(m.manifest_version).toBe(3);
            ctx.expect(m.name).toBe('Test');
            ctx.expect(m.version).toBe('1.0.0');
          });
        } finally {
          fs.rmSync(tmp, { recursive: true, force: true });
        }
      },
    },
    {
      name: 'getManifest returns {} when src/manifest.json is absent',
      run: (ctx) => {
        const tmp = stageProject({});
        try {
          inDir(tmp, (Manager) => {
            ctx.expect(Manager.getManifest()).toEqual({});
          });
        } finally {
          fs.rmSync(tmp, { recursive: true, force: true });
        }
      },
    },
    {
      name: 'getPackage("project") reads cwd package.json',
      run: (ctx) => {
        const tmp = stageProject({ pkg: `{ "name": "test-ext", "version": "2.0.0" }` });
        try {
          inDir(tmp, (Manager) => {
            const pkg = Manager.getPackage('project');
            ctx.expect(pkg.name).toBe('test-ext');
            ctx.expect(pkg.version).toBe('2.0.0');
          });
        } finally {
          fs.rmSync(tmp, { recursive: true, force: true });
        }
      },
    },
    {
      name: 'getPackage("main") reads BXM\'s own package.json',
      run: (ctx) => {
        const Manager = require(path.join(__dirname, '..', '..', '..', 'build.js'));
        const pkg = Manager.getPackage('main');
        ctx.expect(pkg.name).toBe('browser-extension-manager');
      },
    },
    {
      name: 'getEnvironment returns "testing" when BXM_TEST_MODE === "true" (takes precedence)',
      run: (ctx) => {
        const Manager = require(path.join(__dirname, '..', '..', '..', 'build.js'));
        const origTest = process.env.BXM_TEST_MODE;
        const origBuild = process.env.BXM_BUILD_MODE;
        process.env.BXM_TEST_MODE = 'true';
        process.env.BXM_BUILD_MODE = 'true'; // even with build mode set, testing wins
        try {
          ctx.expect(Manager.getEnvironment()).toBe('testing');
        } finally {
          if (origTest === undefined) delete process.env.BXM_TEST_MODE; else process.env.BXM_TEST_MODE = origTest;
          if (origBuild === undefined) delete process.env.BXM_BUILD_MODE; else process.env.BXM_BUILD_MODE = origBuild;
        }
      },
    },
    {
      name: 'getEnvironment returns "development" when BXM_BUILD_MODE !== "true" (and not testing)',
      run: (ctx) => {
        const Manager = require(path.join(__dirname, '..', '..', '..', 'build.js'));
        const original = process.env.BXM_BUILD_MODE;
        const origTest = process.env.BXM_TEST_MODE;
        delete process.env.BXM_BUILD_MODE;
        delete process.env.BXM_TEST_MODE;
        try {
          ctx.expect(Manager.getEnvironment()).toBe('development');
        } finally {
          if (original !== undefined) process.env.BXM_BUILD_MODE = original;
          if (origTest !== undefined) process.env.BXM_TEST_MODE = origTest;
        }
      },
    },
    {
      name: 'getEnvironment returns "production" when BXM_BUILD_MODE === "true" (and not testing)',
      run: (ctx) => {
        const Manager = require(path.join(__dirname, '..', '..', '..', 'build.js'));
        const original = process.env.BXM_BUILD_MODE;
        const origTest = process.env.BXM_TEST_MODE;
        delete process.env.BXM_TEST_MODE;
        process.env.BXM_BUILD_MODE = 'true';
        try {
          ctx.expect(Manager.getEnvironment()).toBe('production');
        } finally {
          if (original === undefined) delete process.env.BXM_BUILD_MODE;
          else                        process.env.BXM_BUILD_MODE = original;
          if (origTest !== undefined) process.env.BXM_TEST_MODE = origTest;
        }
      },
    },
    {
      name: 'getLiveReloadPort defaults to 35729',
      run: (ctx) => {
        const Manager = require(path.join(__dirname, '..', '..', '..', 'build.js'));
        const original = process.env.BXM_LIVERELOAD_PORT;
        delete process.env.BXM_LIVERELOAD_PORT;
        try {
          ctx.expect(Manager.getLiveReloadPort()).toBe(35729);
        } finally {
          if (original !== undefined) process.env.BXM_LIVERELOAD_PORT = original;
        }
      },
    },
    {
      name: 'getRootPath("project") returns cwd, getRootPath("main") returns BXM root',
      run: (ctx) => {
        const Manager = require(path.join(__dirname, '..', '..', '..', 'build.js'));
        ctx.expect(Manager.getRootPath('project')).toBe(process.cwd());
        ctx.expect(Manager.getRootPath('main')).toBe(path.resolve(__dirname, '..', '..', '..', '..'));
      },
    },
  ],
};
