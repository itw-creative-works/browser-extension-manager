// Build-layer tests for lib/affiliatizer.js — exercises the pure map data structure
// (the bulk of its high-value, currently-untested code). `Affiliatizer.initialize()`
// touches `window.location` / `chrome.storage` and requires a browser context — not
// testable at this layer. The regex map IS testable: deterministic, no IO, no globals.

const path = require('path');

const Affiliatizer = require(path.join(__dirname, '..', '..', '..', 'lib', 'affiliatizer.js'));

module.exports = {
  type: 'suite',
  layer: 'build',
  description: 'lib/affiliatizer — URL-match map',
  tests: [
    {
      name: 'get() returns an array of entries',
      run: (ctx) => {
        const map = Affiliatizer.get();
        ctx.expect(Array.isArray(map)).toBe(true);
        ctx.expect(map.length).toBeGreaterThan(0);
      },
    },
    {
      name: 'every entry has { id, match, replace }',
      run: (ctx) => {
        for (const entry of Affiliatizer.get()) {
          ctx.expect(typeof entry.id).toBe('string');
          ctx.expect(entry.match).toBeInstanceOf(RegExp);
          ctx.expect(typeof entry.replace).toBe('object');
        }
      },
    },
    {
      name: 'entry ids are unique',
      run: (ctx) => {
        const ids = Affiliatizer.get().map((e) => e.id);
        const set = new Set(ids);
        ctx.expect(set.size).toBe(ids.length);
      },
    },
    {
      name: 'amazon regex matches amazon.com hostnames',
      run: (ctx) => {
        const amazon = Affiliatizer.get().find((e) => e.id === 'amazon');
        ctx.expect(amazon).toBeDefined();
        ctx.expect(amazon.match.test('www.amazon.com')).toBe(true);
        ctx.expect(amazon.match.test('smile.amazon.com')).toBe(true);
        ctx.expect(amazon.match.test('example.com')).toBe(false);
      },
    },
    {
      name: 'every entry that has replace.href has a valid URL',
      run: (ctx) => {
        for (const entry of Affiliatizer.get()) {
          if (!entry.replace.href) continue;
          let threw = false;
          try { new URL(entry.replace.href); } catch (_) { threw = true; }
          ctx.expect(threw).toBe(false);
        }
      },
    },
  ],
};
