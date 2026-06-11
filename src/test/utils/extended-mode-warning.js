// TEST_EXTENDED_MODE warning — SSOT for consistent messaging.
//
// Mirrors BEM/EM/UJM: `TEST_EXTENDED_MODE` is the shared, unprefixed env var that opts a
// test run into hitting REAL external services instead of skipping/stubbing them. Off by
// default so `npx mgr test` stays fast and offline-safe. Used by the test command (printed to
// console + teed to logs/test.log).
const EXTENDED_MODE_WARNING = [
  '⚠️⚠️⚠️  WARNING: TEST_EXTENDED_MODE IS TRUE  ⚠️⚠️⚠️',
  'Tests that hit real external services (Firebase via web-manager, push, any network call) are ENABLED!',
  'This makes real network calls from the background service worker, popup, and content scripts against live backends.',
];

module.exports = { EXTENDED_MODE_WARNING };
