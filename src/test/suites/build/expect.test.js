// Build-layer test of the test framework's own expect() matchers. Self-test —
// if this doesn't pass, the test framework itself is broken and downstream
// suites can't be trusted.

const path = require('path');

const expect = require(path.join(__dirname, '..', '..', 'assert.js'));

module.exports = {
  type: 'group',
  layer: 'build',
  description: 'expect() — matcher self-test',
  tests: [
    { name: 'toBe passes on ===',           run: () => expect(1).toBe(1) },
    { name: 'toBe.not passes on !==',       run: () => expect(1).not.toBe(2) },
    { name: 'toEqual deep-equals objects',  run: () => expect({ a: [1, 2] }).toEqual({ a: [1, 2] }) },
    { name: 'toEqual fails on shape diff',  run: () => {
      let threw = false;
      try { expect({ a: 1 }).toEqual({ a: 2 }); } catch (_) { threw = true; }
      if (!threw) throw new Error('expected toEqual to throw');
    } },
    { name: 'toBeTruthy / toBeFalsy',       run: () => {
      expect(1).toBeTruthy();
      expect(0).toBeFalsy();
      expect('').toBeFalsy();
      expect('x').toBeTruthy();
    } },
    { name: 'toBeDefined / toBeUndefined',  run: () => {
      expect(null).toBeDefined();
      expect(undefined).toBeUndefined();
    } },
    { name: 'toContain (string)',           run: () => expect('hello world').toContain('world') },
    { name: 'toContain (array)',            run: () => expect([1, 2, 3]).toContain(2) },
    { name: 'toHaveProperty',               run: () => expect({ foo: 1 }).toHaveProperty('foo') },
    { name: 'toMatch (regex)',              run: () => expect('abc123').toMatch(/^abc\d+$/) },
    { name: 'toBeGreaterThan / toBeLessThan', run: () => {
      expect(10).toBeGreaterThan(5);
      expect(5).toBeLessThan(10);
    } },
    { name: 'toThrow on sync function',     run: async () => {
      await expect(() => { throw new Error('boom'); }).toThrow();
    } },
    { name: 'toThrow with regex matcher',   run: async () => {
      await expect(() => { throw new Error('boom: 42'); }).toThrow(/42$/);
    } },
  ],
};
