// Build-layer test for lib/logger-lite.js — verifies the timestamp prefix format
// [HH:MM:SS] name: ... and the five method surface (log/error/warn/info/debug).

const path = require('path');

const Logger = require(path.join(__dirname, '..', '..', '..', 'lib', 'logger-lite.js'));

function captureConsole(method, fn) {
  const captured = [];
  const orig = console[method];
  console[method] = function (...args) { captured.push(args); };
  try { fn(); } finally { console[method] = orig; }
  return captured;
}

module.exports = {
  type: 'suite',
  layer: 'build',
  description: 'lib/logger-lite — timestamp prefix + five-method surface',
  tests: [
    {
      name: 'constructor stores name',
      run: (ctx) => {
        const log = new Logger('my-component');
        ctx.expect(log.name).toBe('my-component');
      },
    },
    {
      name: 'log() prefixes with [HH:MM:SS] name:',
      run: (ctx) => {
        const log = new Logger('feature-x');
        const captured = captureConsole('log', () => log.log('hello', 'world'));
        ctx.expect(captured.length).toBe(1);
        const [prefix, ...rest] = captured[0];
        ctx.expect(prefix).toMatch(/^\[\d{2}:\d{2}:\d{2}\] feature-x:$/);
        ctx.expect(rest).toEqual(['hello', 'world']);
      },
    },
    {
      name: 'exposes log/error/warn/info/debug',
      run: (ctx) => {
        const log = new Logger('s');
        for (const m of ['log', 'error', 'warn', 'info', 'debug']) {
          ctx.expect(typeof log[m]).toBe('function');
        }
      },
    },
    {
      name: 'error() routes through console.error',
      run: (ctx) => {
        const log = new Logger('err-comp');
        const captured = captureConsole('error', () => log.error('boom'));
        ctx.expect(captured.length).toBe(1);
        ctx.expect(captured[0][0]).toMatch(/err-comp:/);
        ctx.expect(captured[0][1]).toBe('boom');
      },
    },
  ],
};
