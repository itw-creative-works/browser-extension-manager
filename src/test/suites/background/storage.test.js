// Background-layer test for chrome.storage.local round-trip. This exercises
// the storage-permission grant (which has to be declared in the harness
// manifest) and the actual SW-side storage API that BXM consumers use.

module.exports = {
  type: 'suite',
  layer: 'background',
  description: 'background SW — chrome.storage.local round-trip',
  tests: [
    {
      name: 'set returns without throwing',
      run: async (ctx) => {
        await chrome.storage.local.set({ bxmTestKey: 'hello' });
        ctx.expect(true).toBe(true);   // reached only if set() didn't throw
      },
    },
    {
      name: 'get returns the just-set value',
      run: async (ctx) => {
        const out = await chrome.storage.local.get('bxmTestKey');
        ctx.expect(out.bxmTestKey).toBe('hello');
      },
    },
    {
      name: 'remove clears the key',
      run: async (ctx) => {
        await chrome.storage.local.remove('bxmTestKey');
        const out = await chrome.storage.local.get('bxmTestKey');
        ctx.expect(out.bxmTestKey).toBeUndefined();
      },
    },
    {
      name: 'multiple keys round-trip together',
      run: async (ctx) => {
        await chrome.storage.local.set({ k1: 1, k2: 'two', k3: [1, 2, 3] });
        const out = await chrome.storage.local.get(['k1', 'k2', 'k3']);
        ctx.expect(out.k1).toBe(1);
        ctx.expect(out.k2).toBe('two');
        ctx.expect(out.k3).toEqual([1, 2, 3]);
        await chrome.storage.local.clear();
      },
    },
  ],
};
