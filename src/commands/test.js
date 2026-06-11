// Libraries
const path    = require('path');
const fs      = require('fs');
const Manager = new (require('../build.js'));
const logger  = Manager.logger('test');
const { run } = require('../test/runner.js');
const attachLogFile = require('../utils/attach-log-file.js');
const { EXTENDED_MODE_WARNING } = require('../test/utils/extended-mode-warning.js');

module.exports = async function (options) {
  // Tee all test output to <projectRoot>/logs/test.log (ANSI-stripped) — mirrors
  // EM's test.log and BEM's test.log pattern.
  attachLogFile(path.join(process.cwd(), 'logs', 'test.log'));

  const layer       = options.layer    || 'all';
  // Positional target: `npx mgr test <target>` where target supports source
  // prefixes — `project:`, `project:<path>`, `mgr:`, `bxm:`, or a bare `<path>`.
  const target      = (options._ && options._[1]) || null;
  // `--filter` flag: substring match on test NAMES/descriptions (orthogonal to target).
  const filter      = options.filter   || null;
  const reporter    = options.reporter || 'pretty';
  // Extended mode — opt into tests that hit REAL external services (Firebase via web-manager,
  // push, any network call) instead of skipping them. Off by default so `npx mgr test` stays
  // fast and offline-safe. The canonical signal is the unprefixed `TEST_EXTENDED_MODE` env var
  // — the SAME name across BEM/BXM/UJM/EM (cross-framework parity); `--extended` is the CLI
  // shorthand. Once set on process.env it propagates to every spawned test environment (the
  // in-process Node runner, and Puppeteer's Chromium which inherits process.env).
  const extended    = options.extended === true
    || options.extended === 'true'
    || process.env.TEST_EXTENDED_MODE === 'true'
    || process.env.TEST_EXTENDED_MODE === '1';

  if (extended) {
    process.env.TEST_EXTENDED_MODE = 'true';
  }

  // Canonical signal — every Manager picks this up via isTesting().
  process.env.BXM_TEST_MODE = 'true';

  // When BXM itself runs its own boot-layer tests (the cwd's package.json is
  // BXM's package.json), there's no real consumer extension to target. Point
  // the boot runner at the fixture under dist/test/fixtures/consumer-extension
  // unless the caller has already set BXM_TEST_BOOT_PROJECT explicitly.
  if (!process.env.BXM_TEST_BOOT_PROJECT) {
    try {
      const cwdPkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
      if (cwdPkg.name === 'browser-extension-manager') {
        process.env.BXM_TEST_BOOT_PROJECT = path.join(__dirname, '..', 'test', 'fixtures', 'consumer-extension');
      }
    } catch (_) { /* no package.json — leave unset */ }
  }

  if (reporter !== 'json') {
    logger.log(`Running tests (layer=${layer}${target ? ` target="${target}"` : ''}${filter ? ` filter="${filter}"` : ''}${extended ? ' +extended' : ''})`);
    logger.log(`Test mode: ${extended ? 'extended (real external APIs)' : 'normal (external APIs skipped)'}`);
    if (extended) {
      logger.warn(EXTENDED_MODE_WARNING[0]);
      EXTENDED_MODE_WARNING.slice(1).forEach((line) => logger.warn(line));
    }
  }

  const result = await run({ layer, target, filter, reporter });

  if (reporter === 'json') {
    // Final machine-readable summary.
    process.stdout.write(JSON.stringify({
      event:   'summary',
      passed:  result.passed,
      failed:  result.failed,
      skipped: result.skipped,
      total:   result.passed + result.failed + result.skipped,
    }) + '\n');
  }

  if (result.failed > 0) {
    process.exitCode = 1;
    await attachLogFile.detach();
    throw new Error(`${result.failed} test(s) failed`);
  }

  // Flush test.log fully and restore stdout/stderr. Stream writes are async, so
  // detach() resolves once the buffered tail (the Results block) is on disk.
  await attachLogFile.detach();
};
