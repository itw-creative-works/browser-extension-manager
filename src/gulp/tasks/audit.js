// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('audit');
const path = require('path');
const jetpack = require('fs-jetpack');
const { series } = require('gulp');
const chalk = require('chalk');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');
const rootPathPackage = Manager.getRootPath('main');
const rootPathProject = Manager.getRootPath('project');

// Audit results tracker
const auditResults = {
  externalScripts: [],
};

// Patterns to detect external script references
const EXTERNAL_SCRIPT_PATTERNS = [
  // Script tags
  /<script[^>]*src=["'](https?:\/\/[^"']+)["']/gi,
  // Dynamic script creation
  /createElement\s*\(\s*["']script["']\s*\)[^}]*src\s*=\s*["'](https?:\/\/[^"']+)["']/gi,
  // Direct URL assignments to src
  /\.src\s*=\s*["'](https?:\/\/[^"']+)["']/gi,
  // fetch/XMLHttpRequest calls to external URLs (common pattern for loading scripts)
  /fetch\s*\(\s*["'](https?:\/\/[^"']+\.js[^"']*)["']/gi,
  /XMLHttpRequest[^}]*open\s*\([^,]*,\s*["'](https?:\/\/[^"']+\.js[^"']*)["']/gi,
  // import() dynamic imports of external URLs
  /import\s*\(\s*["'](https?:\/\/[^"']+)["']/gi,
  // require() of external URLs
  /require\s*\(\s*["'](https?:\/\/[^"']+)["']/gi,
];

// Check a single file for external script references
function checkFileForExternalScripts(filePath) {
  try {
    const content = jetpack.read(filePath);
    if (!content) {
      return [];
    }

    const found = [];
    const lines = content.split('\n');

    EXTERNAL_SCRIPT_PATTERNS.forEach(pattern => {
      let match;
      const globalPattern = new RegExp(pattern.source, pattern.flags);

      while ((match = globalPattern.exec(content)) !== null) {
        const url = match[1];
        const lineNumber = content.substring(0, match.index).split('\n').length;

        found.push({
          file: path.relative(rootPathProject, filePath),
          url: url,
          line: lineNumber,
          pattern: pattern.source.substring(0, 50) + '...',
        });
      }
    });

    return found;
  } catch (e) {
    logger.error(`Error reading file ${filePath}:`, e.message);
    return [];
  }
}

// Main audit task
async function auditFn(complete) {
  // Log
  logger.log('Starting audit...');

  // Skip if not in build mode
  if (!Manager.isBuildMode()) {
    logger.log('Skipping audit (not in build mode)');
    return complete();
  }

  // Reset results
  auditResults.externalScripts = [];

  try {
    // Find all files in packaged directory (JS, HTML, etc.)
    const packagedDir = path.join(rootPathProject, 'packaged', 'raw');

    if (!jetpack.exists(packagedDir)) {
      logger.log(chalk.yellow('⚠️  Packaged directory not found. Run package task first.'));
      return complete();
    }

    const files = jetpack.find(packagedDir, { matching: ['**/*.js', '**/*.html'] });

    logger.log(`Auditing ${files.length} files (JS, HTML)...`);

    // Check each file
    files.forEach(filePath => {
      const externalScripts = checkFileForExternalScripts(filePath);
      if (externalScripts.length > 0) {
        auditResults.externalScripts.push(...externalScripts);
      }
    });

    // Display results
    displayAuditResults();

    // Log
    logger.log('Audit completed!');

    // Complete
    return complete();
  } catch (e) {
    logger.error('Error during audit:', e);
    return complete();
  }
}

// Display audit results
function displayAuditResults() {
  console.log('\n' + chalk.bold('═══════════════════════════════════════════════════'));
  console.log(chalk.bold('                 AUDIT RESULTS'));
  console.log(chalk.bold('═══════════════════════════════════════════════════') + '\n');

  // External Scripts
  if (auditResults.externalScripts.length > 0) {
    console.log(chalk.red.bold('❌ EXTERNAL SCRIPTS DETECTED'));
    console.log(chalk.gray('Chrome extensions do not allow external scripts to be loaded.\n'));

    auditResults.externalScripts.forEach((item, index) => {
      console.log(chalk.red(`  ${index + 1}. ${item.file}:${item.line}`));
      console.log(chalk.gray(`     URL: ${item.url}`));
      console.log('');
    });
  } else {
    console.log(chalk.green('✅ No external scripts detected'));
  }

  // Summary
  console.log(chalk.bold('\n───────────────────────────────────────────────────'));
  console.log(chalk.bold('SUMMARY'));
  console.log(chalk.bold('───────────────────────────────────────────────────'));

  const externalScriptCount = auditResults.externalScripts.length;
  const externalScriptColor = externalScriptCount > 0 ? chalk.red : chalk.green;
  console.log(externalScriptColor(`External Scripts: ${externalScriptCount}`));

  console.log(chalk.bold('═══════════════════════════════════════════════════\n'));
}

// Export task
module.exports = series(auditFn);
