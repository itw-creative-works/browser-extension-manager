// Chromium-runner — launches Puppeteer with the BXM harness extension loaded,
// runs background-layer suites in the SW context via CDP Runtime.evaluate, then
// runs view-layer suites in tabs pointed at popup/options/sidepanel pages.
//
// Communication channel: each injected test wraps its events as
//   console.log('__BXM_TEST__' + JSON.stringify(evt))
// from inside the SW / tab. The runner subscribes to `Runtime.consoleAPICalled`
// (for SW) and Puppeteer's `page.on('console')` (for tabs) and parses those
// lines exactly like EM's electron runner parses stdout. Same JSON-line
// protocol — different transport.
//
// Test source is shipped as a string. Each test's `run` function body is
// extracted at load-time and wrapped as `(async (ctx) => { <body> })(ctx)`
// inside an outer harness that constructs `ctx` + `expect` from inline
// assert.js source. The body has no closure to its file — it must `require`
// nothing and rely only on `ctx` + globals (`chrome`, `globalThis`).

const path = require('path');
const fs   = require('fs');
const chalk = require('chalk').default;

// Inline the source of assert.js so we can build it into the injected harness
// payload. The runner reads it from disk once at module-load time.
const ASSERT_SRC = fs.readFileSync(path.join(__dirname, '..', 'assert.js'), 'utf8');

async function runChromiumTests({ backgroundSuiteFiles, viewSuiteFiles, filter, projectRoot, bxmDistRoot }) {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    const skipped = backgroundSuiteFiles.length + viewSuiteFiles.length;
    console.log(chalk.yellow(`    ○ background + view tests skipped (puppeteer not installed)`));
    return { passed: 0, failed: 0, skipped };
  }

  const harnessExt = path.join(bxmDistRoot, 'test', 'harness', 'extension');
  if (!fs.existsSync(path.join(harnessExt, 'manifest.json'))) {
    console.log(chalk.yellow(`    ○ background + view tests skipped (harness extension not built at ${harnessExt})`));
    return { passed: 0, failed: 0, skipped: backgroundSuiteFiles.length + viewSuiteFiles.length };
  }

  const counts = { passed: 0, failed: 0, skipped: 0 };

  // Chromium-with-extensions requires the "new" headless mode (--headless=new in CLI
  // terms). MV3 SWs don't start in old headless. Puppeteer sets it for us when we
  // pass headless: 'new'.
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      `--disable-extensions-except=${harnessExt}`,
      `--load-extension=${harnessExt}`,
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    // Locate the SW target. Chromium spawns it asynchronously; poll for up to 5s.
    const swTarget = await waitForTarget(browser, (t) => t.type() === 'service_worker' && t.url().includes('background.js'), 5000);
    if (!swTarget) {
      console.log(chalk.red(`    ✗ Harness service worker never came up — aborting browser layer.`));
      const total = backgroundSuiteFiles.length + viewSuiteFiles.length;
      return { passed: 0, failed: total, skipped: 0 };
    }

    // Background suites first.
    if (backgroundSuiteFiles.length > 0) {
      const r = await runBackgroundSuites({
        browser,
        swTarget,
        suiteFiles: backgroundSuiteFiles,
        filter,
      });
      counts.passed  += r.passed;
      counts.failed  += r.failed;
      counts.skipped += r.skipped;
    }

    // View suites next — popup/options/sidepanel are all loaded as plain
    // chrome-extension:// pages. Same Chromium instance, fresh tab per suite.
    if (viewSuiteFiles.length > 0) {
      const extId = swTarget.url().split('/')[2];   // chrome-extension://<id>/background.js
      const r = await runViewSuites({
        browser,
        extId,
        suiteFiles: viewSuiteFiles,
        filter,
      });
      counts.passed  += r.passed;
      counts.failed  += r.failed;
      counts.skipped += r.skipped;
    }
  } finally {
    try { await browser.close(); } catch (_) { /* ignore */ }
  }

  return counts;
}

// ─── Background layer ────────────────────────────────────────────────────────

async function runBackgroundSuites({ browser, swTarget, suiteFiles, filter }) {
  const counts = { passed: 0, failed: 0, skipped: 0 };

  // Attach a CDP session to the SW so we can Runtime.evaluate inside it.
  // Puppeteer's WorkerTarget exposes `.worker()` for accessing the underlying
  // Worker handle.
  const worker = await swTarget.worker();
  if (!worker) {
    console.log(chalk.red(`    ✗ Could not attach to harness service worker.`));
    return { passed: 0, failed: suiteFiles.length, skipped: 0 };
  }

  // Subscribe to console output from the SW. Each '__BXM_TEST__...' line is a
  // structured test event. Anything else is incidental SW logging — surface it
  // in BXM_TEST_DEBUG mode.
  const consoleHandler = (msg) => {
    const text = msg.text();
    if (text.startsWith('__BXM_TEST__')) {
      handleConsoleLine(text, counts);
    } else if (process.env.BXM_TEST_DEBUG) {
      process.stdout.write(chalk.gray(`      [sw:${msg.type()}] ${text}\n`));
    }
  };
  worker.on('console', consoleHandler);

  try {
    for (const file of suiteFiles) {
      let mod;
      try {
        delete require.cache[require.resolve(file)];
        mod = require(file);
      } catch (e) {
        console.log(chalk.red(`    ✗ ${file}: Failed to load: ${e.message}`));
        counts.failed += 1;
        continue;
      }
      if (Array.isArray(mod)) mod = { type: 'group', tests: mod };
      if (mod.layer !== 'background') continue;

      const suiteName = mod.description || path.basename(file);
      console.log(chalk.cyan(`    ⤷ ${suiteName}`));

      if (mod.skip) {
        const count = Array.isArray(mod.tests) ? mod.tests.length : 1;
        console.log(chalk.yellow(`      ○ ${suiteName}`) + chalk.gray(` (skipped)`));
        counts.skipped += count;
        continue;
      }

      const isSuite = mod.type === 'suite' || mod.type === 'group' || Array.isArray(mod.tests);
      const tests   = isSuite ? (mod.tests || []) : [{ name: suiteName, run: mod.run, timeout: mod.timeout }];
      const isGroup = mod.type === 'group';
      const stopOnFailure = !isGroup && isSuite && mod.stopOnFailure !== false;

      // Build a single payload that runs every test in the suite sequentially
      // inside the SW. Shared `state` lives inside the SW for the lifetime of
      // the suite. The runner emits one __BXM_TEST__ event per test.
      const payload = buildSuitePayload({ suiteName, tests, filter, stopOnFailure, timeout: mod.timeout });
      try {
        await worker.evaluate(payload);
      } catch (e) {
        // worker.evaluate rejects on syntax errors / top-level throws inside
        // the SW. The injected harness traps per-test errors itself; a
        // rejection here means the wrapper code itself broke.
        console.log(chalk.red(`      ✗ ${suiteName}: harness threw: ${e.message}`));
        counts.failed += tests.length;
      }
    }
  } finally {
    worker.off('console', consoleHandler);
  }

  return counts;
}

// ─── View layer ───────────────────────────────────────────────────────────────

async function runViewSuites({ browser, extId, suiteFiles, filter }) {
  const counts = { passed: 0, failed: 0, skipped: 0 };

  for (const file of suiteFiles) {
    let mod;
    try {
      delete require.cache[require.resolve(file)];
      mod = require(file);
    } catch (e) {
      console.log(chalk.red(`    ✗ ${file}: Failed to load: ${e.message}`));
      counts.failed += 1;
      continue;
    }
    if (Array.isArray(mod)) mod = { type: 'group', tests: mod };
    if (mod.layer !== 'view') continue;

    const suiteName = mod.description || path.basename(file);
    const context   = mod.context || 'popup';   // popup | options | sidepanel
    console.log(chalk.cyan(`    ⤷ ${suiteName} (${context})`));

    if (mod.skip) {
      const count = Array.isArray(mod.tests) ? mod.tests.length : 1;
      console.log(chalk.yellow(`      ○ ${suiteName}`) + chalk.gray(` (skipped)`));
      counts.skipped += count;
      continue;
    }

    const isSuite = mod.type === 'suite' || mod.type === 'group' || Array.isArray(mod.tests);
    const tests   = isSuite ? (mod.tests || []) : [{ name: suiteName, run: mod.run, timeout: mod.timeout }];
    const isGroup = mod.type === 'group';
    const stopOnFailure = !isGroup && isSuite && mod.stopOnFailure !== false;

    const url  = `chrome-extension://${extId}/${context}.html`;
    const page = await browser.newPage();
    const consoleHandler = (msg) => {
      const text = msg.text();
      if (text.startsWith('__BXM_TEST__')) {
        handleConsoleLine(text, counts);
      } else if (process.env.BXM_TEST_DEBUG) {
        process.stdout.write(chalk.gray(`      [tab:${msg.type()}] ${text}\n`));
      }
    };
    page.on('console', consoleHandler);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const payload = buildSuitePayload({ suiteName, tests, filter, stopOnFailure, timeout: mod.timeout });
      await page.evaluate(payload);
    } catch (e) {
      console.log(chalk.red(`      ✗ ${suiteName}: harness threw: ${e.message}`));
      counts.failed += tests.length;
    } finally {
      page.off('console', consoleHandler);
      try { await page.close(); } catch (_) { /* ignore */ }
    }
  }

  return counts;
}

// ─── Suite payload builder ────────────────────────────────────────────────────

// Build a single string of JavaScript that, when evaluated inside the SW or a tab,
// runs all `tests` sequentially and emits __BXM_TEST__ events per result.
//
// Why string-payload vs function-passing? Puppeteer can pass functions, but
// `worker.evaluate(fn, ...args)` serializes args via JSON (no functions). So
// every test function body must be string-ified and rebuilt inside the target
// context. We do that here.
function buildSuitePayload({ suiteName, tests, filter, stopOnFailure, timeout: suiteTimeout }) {
  // MV3 service workers have a strict CSP that forbids `eval`, `new Function`,
  // `new AsyncFunction` — anything that compiles a string into code at runtime.
  // So we CANNOT rebuild test functions from a string inside the SW.
  //
  // Instead: bake each test's source as a literal async-function expression
  // directly into the payload at runner build-time. The CSP allows that because
  // the SW only sees pre-compiled code arriving via the top-level Runtime.evaluate
  // (which CDP exempts from CSP) — no inner `eval` happens.
  //
  // Each test becomes an entry like:
  //   { name: 'foo', timeout: 30000, fn: async (ctx, expect, state) => { /* body */ } }
  // and is called via `await tests[i].fn(ctx, expect, state)`.
  const inlinedTests = tests
    .filter((t) => !filter || t.name.includes(filter) || suiteName.includes(filter))
    .map((t) => {
      const body  = extractFnBody(t.run);
      const skip  = t.skip ? JSON.stringify(t.skip) : 'false';
      const tout  = t.timeout || suiteTimeout || 30000;
      return `  { name: ${JSON.stringify(t.name)}, skip: ${skip}, timeout: ${tout}, fn: async (ctx, expect, state) => {\n${body}\n} },`;
    })
    .join('\n');

  // assert.js declares `function expect(...) { ... }` at the top level. We strip its
  // `module.exports = expect` line (no `module` in the browser) and keep the function
  // declaration available as the local `expect`.
  return `
(async function () {
  'use strict';
  ${ASSERT_SRC.replace(/module\.exports\s*=\s*expect;?/, '')}

  function emit(evt) {
    console.log('__BXM_TEST__' + JSON.stringify(evt));
  }

  class SkipError extends Error { constructor(reason) { super(reason); this.name = 'SkipError'; } }

  const suiteName  = ${JSON.stringify(suiteName)};
  const stopOnFail = ${JSON.stringify(!!stopOnFailure)};
  const tests = [
${inlinedTests}
  ];

  emit({ event: 'suite-start', name: suiteName });

  const state = {};
  let passed = 0, failed = 0, skipped = 0;

  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    if (t.skip) {
      const reason = typeof t.skip === 'string' ? t.skip : 'skipped';
      emit({ event: 'skip', name: suiteName + ' → ' + t.name, reason });
      skipped += 1;
      continue;
    }

    const ctx = {
      expect,
      state,
      layer: 'browser',
      skip(reason) { throw new SkipError(reason || 'skipped at runtime'); },
    };

    const start = Date.now();
    try {
      await Promise.race([
        t.fn(ctx, expect, state),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), t.timeout)),
      ]);
      const duration = Date.now() - start;
      emit({ event: 'result', name: t.name, passed: true, duration });
      passed += 1;
    } catch (e) {
      const duration = Date.now() - start;
      if (e && e.name === 'SkipError') {
        emit({ event: 'skip', name: suiteName + ' → ' + t.name, reason: e.message });
        skipped += 1;
        continue;
      }
      emit({ event: 'result', name: t.name, passed: false, duration, error: (e && e.message) || String(e) });
      failed += 1;
      if (stopOnFail) {
        const rem = tests.length - i - 1;
        if (rem > 0) { emit({ event: 'suite-stopped', name: suiteName, remaining: rem }); skipped += rem; }
        break;
      }
    }
  }

  emit({ event: 'suite-end', name: suiteName, passed, failed, skipped });
})();
`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function handleConsoleLine(text, counts) {
  let evt;
  try { evt = JSON.parse(text.slice('__BXM_TEST__'.length)); } catch (_) { return; }
  if (evt.event === 'result') {
    if (evt.passed) {
      console.log(chalk.green(`      ✓ ${evt.name}`) + chalk.gray(` (${evt.duration}ms)`));
      counts.passed += 1;
    } else {
      console.log(chalk.red(`      ✗ ${evt.name}`) + chalk.gray(` (${evt.duration}ms)`));
      if (evt.error) console.log(chalk.red(`        ${evt.error}`));
      counts.failed += 1;
    }
  } else if (evt.event === 'skip') {
    console.log(chalk.yellow(`      ○ ${evt.name}`) + chalk.gray(` (skipped: ${evt.reason})`));
    counts.skipped += 1;
  } else if (evt.event === 'suite-stopped') {
    console.log(chalk.yellow(`        Skipping ${evt.remaining} remaining test(s) in suite`));
  } else if (evt.event === 'suite-end' || evt.event === 'suite-start') {
    // No-op — suite framing already printed by the parent before evaluate().
  }
}

async function waitForTarget(browser, predicate, timeoutMs) {
  const found = browser.targets().find(predicate);
  if (found) return found;
  return new Promise((resolve) => {
    const done = (t) => { browser.off('targetcreated', handle); resolve(t); };
    const handle = (t) => { if (predicate(t)) done(t); };
    browser.on('targetcreated', handle);
    setTimeout(() => done(null), timeoutMs);
  });
}

// Extract the body of a function as a string. Handles arrow / async arrow /
// named function / async named function forms. Used to ship test bodies into
// the SW/tab via Runtime.evaluate.
function extractFnBody(fn) {
  if (typeof fn !== 'function') return 'throw new Error("test has no run() function");';
  const src = fn.toString();
  // Arrow with block body
  let m = src.match(/^\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{([\s\S]*)\}\s*$/);
  if (m) return m[1];
  // Arrow with expression body
  m = src.match(/^\s*(?:async\s+)?\([^)]*\)\s*=>\s*([\s\S]+)$/);
  if (m) return `return ${m[1].trim()};`;
  // Named / anonymous function
  m = src.match(/^\s*(?:async\s+)?function\s*[a-zA-Z0-9_]*\s*\([^)]*\)\s*\{([\s\S]*)\}\s*$/);
  if (m) return m[1];
  // Method shorthand
  m = src.match(/^[^(]*\([^)]*\)\s*\{([\s\S]*)\}\s*$/);
  if (m) return m[1];
  return `return (${src}).call(null, ctx);`;
}

module.exports = { runChromiumTests };
