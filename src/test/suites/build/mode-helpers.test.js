// Build-layer test for utils/mode-helpers.js — verifies the cross-context helpers
// (isDevelopment / isProduction / isTesting / getVersion) behave correctly in a
// Node context (no `chrome` global), driven by env vars + cwd package.json.

const path = require('path');
const fs   = require('fs');
const os   = require('os');

const helpers = require(path.join(__dirname, '..', '..', '..', 'utils', 'mode-helpers.js'));

function withEnv(overrides, fn) {
  const originals = {};
  for (const [k, v] of Object.entries(overrides)) {
    originals[k] = process.env[k];
    if (v === null) delete process.env[k];
    else            process.env[k] = v;
  }
  try { return fn(); } finally {
    for (const [k, v] of Object.entries(originals)) {
      if (v === undefined) delete process.env[k];
      else                 process.env[k] = v;
    }
  }
}

module.exports = {
  type: 'suite',
  layer: 'build',
  description: 'utils/mode-helpers — cross-context isDevelopment/isTesting/getVersion',
  tests: [
    {
      name: 'exports { attachTo, getEnvironment, isDevelopment, isProduction, isTesting, getVersion }',
      run: (ctx) => {
        ctx.expect(typeof helpers.attachTo).toBe('function');
        ctx.expect(typeof helpers.getEnvironment).toBe('function');
        ctx.expect(typeof helpers.isDevelopment).toBe('function');
        ctx.expect(typeof helpers.isProduction).toBe('function');
        ctx.expect(typeof helpers.isTesting).toBe('function');
        ctx.expect(typeof helpers.getVersion).toBe('function');
      },
    },
    {
      name: 'isTesting() reads BXM_TEST_MODE env var',
      run: (ctx) => {
        withEnv({ BXM_TEST_MODE: 'true' }, () => {
          ctx.expect(helpers.isTesting()).toBe(true);
        });
        withEnv({ BXM_TEST_MODE: null }, () => {
          ctx.expect(helpers.isTesting()).toBe(false);
        });
      },
    },
    {
      name: 'isDevelopment() is true under NODE_ENV=development (and not testing)',
      run: (ctx) => {
        withEnv({ NODE_ENV: 'development', BXM_BUILD_MODE: null, BXM_TEST_MODE: null }, () => {
          ctx.expect(helpers.isDevelopment()).toBe(true);
        });
      },
    },
    {
      name: 'isDevelopment() is false / isProduction() true when BXM_BUILD_MODE=true (and not testing)',
      run: (ctx) => {
        withEnv({ NODE_ENV: null, BXM_BUILD_MODE: 'true', BXM_TEST_MODE: null }, () => {
          ctx.expect(helpers.isDevelopment()).toBe(false);
          ctx.expect(helpers.isProduction()).toBe(true);
        });
      },
    },
    {
      name: 'testing takes precedence — is* are mutually exclusive (exactly one true)',
      run: (ctx) => {
        withEnv({ BXM_TEST_MODE: 'true', BXM_BUILD_MODE: 'true' }, () => {
          ctx.expect(helpers.isTesting()).toBe(true);
          ctx.expect(helpers.isDevelopment()).toBe(false);
          ctx.expect(helpers.isProduction()).toBe(false);
        });
      },
    },
    {
      name: 'attachTo() mixes helpers into a constructor + its prototype',
      run: (ctx) => {
        function FakeManager() {}
        helpers.attachTo(FakeManager);
        ctx.expect(typeof FakeManager.getEnvironment).toBe('function');
        ctx.expect(typeof FakeManager.prototype.getEnvironment).toBe('function');
        ctx.expect(typeof FakeManager.isDevelopment).toBe('function');
        ctx.expect(typeof FakeManager.prototype.isDevelopment).toBe('function');
        ctx.expect(typeof FakeManager.isTesting).toBe('function');
        ctx.expect(typeof FakeManager.prototype.isTesting).toBe('function');
        ctx.expect(typeof FakeManager.getVersion).toBe('function');
      },
    },
    {
      // The core invariant of the SSOT refactor: is*() DERIVE from getEnvironment(), so they
      // can NEVER disagree with it, and exactly one is always true. (In build-time Node `chrome`
      // is undefined, so getEnvironment() resolves via the env-var fallback.)
      name: 'invariant: is*() exactly matches getEnvironment() + mutually exclusive (every scenario)',
      run: (ctx) => {
        const scenarios = [
          { env: { BXM_TEST_MODE: 'true', BXM_BUILD_MODE: 'true', NODE_ENV: null }, expect: 'testing' },
          { env: { BXM_TEST_MODE: null, BXM_BUILD_MODE: 'true', NODE_ENV: null },    expect: 'production' },
          { env: { BXM_TEST_MODE: null, BXM_BUILD_MODE: null, NODE_ENV: 'development' }, expect: 'development' },
          { env: { BXM_TEST_MODE: null, BXM_BUILD_MODE: null, NODE_ENV: null },       expect: 'development' }, // BXM defaults dev (unpacked)
        ];
        for (const s of scenarios) {
          withEnv(s.env, () => {
            const e = helpers.getEnvironment();
            ctx.expect(e).toBe(s.expect);
            ctx.expect(helpers.isDevelopment()).toBe(e === 'development');
            ctx.expect(helpers.isTesting()).toBe(e === 'testing');
            ctx.expect(helpers.isProduction()).toBe(e === 'production');
            const trueCount = [helpers.isDevelopment(), helpers.isTesting(), helpers.isProduction()].filter(Boolean).length;
            ctx.expect(trueCount).toBe(1);
          });
        }
      },
    },
    {
      name: 'getVersion() reads cwd package.json#version in Node context',
      run: (ctx) => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bxm-modehelpers-'));
        fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'x', version: '9.9.9' }));
        const oldCwd = process.cwd();
        try {
          process.chdir(tmp);
          ctx.expect(helpers.getVersion()).toBe('9.9.9');
        } finally {
          process.chdir(oldCwd);
          fs.rmSync(tmp, { recursive: true, force: true });
        }
      },
    },
  ],
};
