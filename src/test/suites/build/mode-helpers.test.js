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
      name: 'exports { attachTo, isDevelopment, isProduction, isTesting, getVersion }',
      run: (ctx) => {
        ctx.expect(typeof helpers.attachTo).toBe('function');
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
      name: 'isDevelopment() is true under NODE_ENV=development',
      run: (ctx) => {
        withEnv({ NODE_ENV: 'development', BXM_BUILD_MODE: null }, () => {
          ctx.expect(helpers.isDevelopment()).toBe(true);
        });
      },
    },
    {
      name: 'isDevelopment() is false when BXM_BUILD_MODE=true',
      run: (ctx) => {
        withEnv({ NODE_ENV: null, BXM_BUILD_MODE: 'true' }, () => {
          ctx.expect(helpers.isDevelopment()).toBe(false);
        });
      },
    },
    {
      name: 'attachTo() mixes helpers into a constructor + its prototype',
      run: (ctx) => {
        function FakeManager() {}
        helpers.attachTo(FakeManager);
        ctx.expect(typeof FakeManager.isDevelopment).toBe('function');
        ctx.expect(typeof FakeManager.prototype.isDevelopment).toBe('function');
        ctx.expect(typeof FakeManager.isTesting).toBe('function');
        ctx.expect(typeof FakeManager.prototype.isTesting).toBe('function');
        ctx.expect(typeof FakeManager.getVersion).toBe('function');
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
