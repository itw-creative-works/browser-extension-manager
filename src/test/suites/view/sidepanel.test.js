// View-layer test for the sidepanel context. Most consumers of BXM use
// chrome.sidePanel for the Chrome 114+ UI panel surface — verify that
// the test harness can target it just like popup/options.

module.exports = {
  layer: 'view',
  context: 'sidepanel',
  description: 'view/sidepanel — DOM + context attribute',
  run: async (ctx) => {
    ctx.expect(document.body.dataset.bxmContext).toBe('sidepanel');
    ctx.expect(document.title).toContain('Side Panel');
    ctx.expect(typeof chrome.runtime.id).toBe('string');
  },
};
