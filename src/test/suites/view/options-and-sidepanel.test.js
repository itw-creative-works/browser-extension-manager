// View-layer test that the same Manager surface is reachable from the options
// page. Confirms that view tests can target ANY of popup / options / sidepanel
// just by setting the `context` field — same `ctx.expect / state / skip` API
// applies. (Sidepanel is exercised separately in sidepanel.test.js.)

module.exports = {
  layer: 'view',
  context: 'options',
  description: 'view/options — DOM + context attribute',
  run: async (ctx) => {
    ctx.expect(document.body.dataset.bxmContext).toBe('options');
    ctx.expect(document.title).toContain('Options');
  },
};
