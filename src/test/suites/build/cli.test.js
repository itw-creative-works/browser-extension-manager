// Build-layer tests for cli.js alias resolution. We instantiate Main and call
// process({ _: ['<alias>'] }) — the resolver looks up the alias map and require()s
// the command module. To avoid actually running the command, we stub each command
// to a no-op via require.cache injection before calling process().

const path = require('path');

const CLI_PATH = path.join(__dirname, '..', '..', '..', 'cli.js');
const COMMANDS_DIR = path.join(__dirname, '..', '..', '..', 'commands');

function stubCommand(name, fn) {
  const file = path.join(COMMANDS_DIR, `${name}.js`);
  require.cache[file] = {
    id:       file,
    filename: file,
    loaded:   true,
    children: [],
    paths:    [],
    exports:  fn,
  };
}

function unstub(name) {
  delete require.cache[path.join(COMMANDS_DIR, `${name}.js`)];
}

function freshCli() {
  delete require.cache[CLI_PATH];
  return require(CLI_PATH);
}

module.exports = {
  type: 'suite',
  layer: 'build',
  description: 'cli — alias resolution + dispatch',
  tests: [
    {
      name: 'positional "test" routes to commands/test.js',
      run: async (ctx) => {
        let invoked = false;
        stubCommand('test', async () => { invoked = true; });
        try {
          const Main = freshCli();
          await new Main().process({ _: ['test'] });
          ctx.expect(invoked).toBe(true);
        } finally {
          unstub('test');
        }
      },
    },
    {
      name: 'alias "-t" routes to test command',
      run: async (ctx) => {
        let invoked = false;
        stubCommand('test', async () => { invoked = true; });
        try {
          const Main = freshCli();
          await new Main().process({ _: [], t: true });
          ctx.expect(invoked).toBe(true);
        } finally {
          unstub('test');
        }
      },
    },
    {
      name: 'positional "clean" routes to commands/clean.js',
      run: async (ctx) => {
        let invoked = false;
        stubCommand('clean', async () => { invoked = true; });
        try {
          const Main = freshCli();
          await new Main().process({ _: ['clean'] });
          ctx.expect(invoked).toBe(true);
        } finally {
          unstub('clean');
        }
      },
    },
    {
      name: 'no command defaults to setup',
      run: async (ctx) => {
        let invoked = false;
        stubCommand('setup', async () => { invoked = true; });
        try {
          const Main = freshCli();
          await new Main().process({ _: [] });
          ctx.expect(invoked).toBe(true);
        } finally {
          unstub('setup');
        }
      },
    },
    {
      name: 'unknown command throws "Command not found"',
      run: async (ctx) => {
        const Main = freshCli();
        let threw = false;
        try {
          await new Main().process({ _: ['totally-not-a-command-xyz'] });
        } catch (e) {
          threw = true;
          ctx.expect(e.message).toContain('not found');
        }
        ctx.expect(threw).toBe(true);
      },
    },
    {
      name: 'command options are forwarded',
      run: async (ctx) => {
        let received = null;
        stubCommand('test', async (opts) => { received = opts; });
        try {
          const Main = freshCli();
          await new Main().process({ _: ['test'], layer: 'build', filter: 'foo' });
          ctx.expect(received.layer).toBe('build');
          ctx.expect(received.filter).toBe('foo');
        } finally {
          unstub('test');
        }
      },
    },
  ],
};
