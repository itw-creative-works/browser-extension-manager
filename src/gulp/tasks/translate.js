// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('translate');
const { series } = require('gulp');
const jetpack = require('fs-jetpack');
const path = require('path');
const { execute } = require('node-powertools');
const JSON5 = require('json5');

// Languages to translate
const LANGUAGES = [
  'zh',
  'es',
  'hi',
  'ar',
  'pt',
  'ru',
  'ja',
  'de',
  'fr',
  'ko',
  'ur',
  'id',
  'bn',
  'tl',
  'vi',
  'it',
];

// Paths
const localesDir = path.join(process.cwd(), 'src', '_locales');
const enMessagesPath = path.join(localesDir, 'en', 'messages.json');

// Main translate task
async function translate(complete) {
  // Only run in build mode
  if (!Manager.isBuildMode()) {
    logger.log('Skipping translation (not in build mode)');
    return complete();
  }

  // Log
  logger.log('Starting translation...');

  // Check if English messages exist
  if (!jetpack.exists(enMessagesPath)) {
    logger.warn(`English messages not found at ${enMessagesPath}`);
    return complete();
  }

  // Read English messages
  let enMessages;
  try {
    enMessages = JSON5.parse(jetpack.read(enMessagesPath));
  } catch (e) {
    logger.error(`Failed to parse English messages: ${e.message}`);
    return complete();
  }

  // Get English keys
  const enKeys = Object.keys(enMessages);
  logger.log(`Found ${enKeys.length} keys in English messages`);

  // Build translation tasks for all languages in parallel
  const translationTasks = LANGUAGES.map(async (lang) => {
    const langDir = path.join(localesDir, lang);
    const langMessagesPath = path.join(langDir, 'messages.json');

    // Check if translation exists
    const exists = jetpack.exists(langMessagesPath);
    let needsTranslation = !exists;
    let existingMessages = {};
    let missingKeys = [];

    // If exists, check for missing keys
    if (exists) {
      try {
        existingMessages = JSON5.parse(jetpack.read(langMessagesPath));
        missingKeys = enKeys.filter(key => !existingMessages[key]);
        needsTranslation = missingKeys.length > 0;

        if (needsTranslation) {
          logger.log(`[${lang}] Found ${missingKeys.length} missing keys`);
        }
      } catch (e) {
        logger.warn(`[${lang}] Failed to parse existing messages, will retranslate: ${e.message}`);
        needsTranslation = true;
        missingKeys = enKeys;
      }
    } else {
      missingKeys = enKeys;
    }

    // Skip if no translation needed
    if (!needsTranslation) {
      logger.log(`[${lang}] Up to date, skipping`);
      return;
    }

    // Build messages to translate
    const messagesToTranslate = {};
    missingKeys.forEach(key => {
      messagesToTranslate[key] = enMessages[key];
    });

    // Translate using Claude CLI
    try {
      logger.log(`[${lang}] Translating ${missingKeys.length} keys...`);

      const translated = await translateWithClaude(messagesToTranslate, lang);

      // Merge with existing messages
      const finalMessages = { ...existingMessages, ...translated };

      // Ensure directory exists
      jetpack.dir(langDir);

      // Write translated messages
      jetpack.write(langMessagesPath, JSON.stringify(finalMessages, null, 2));

      logger.log(`[${lang}] Translation complete`);
    } catch (e) {
      logger.error(`[${lang}] Translation failed: ${e.message}`);
    }
  });

  // Run all translations in parallel
  await Promise.all(translationTasks);

  // Log
  logger.log('Translation finished!');

  // Complete
  return complete();
}

// Translate using Claude CLI
async function translateWithClaude(messages, targetLang) {
  const prompt = `Translate the following Chrome extension messages.json content from English to ${getLanguageName(targetLang)} (${targetLang}).

IMPORTANT RULES:
1. Only translate the "message" field values
2. Keep the "description" field values in English (they are for developers)
3. Keep all JSON keys exactly as they are
4. Return ONLY valid JSON, no markdown, no explanation
5. Preserve any placeholders like $1, $2, etc.

Input JSON:
${JSON.stringify(messages, null, 2)}

Output the translated JSON:`;

  // Write prompt to temp file to avoid shell escaping issues
  const tempDir = path.join(process.cwd(), '.temp');
  const tempFile = path.join(tempDir, `translate-${targetLang}.txt`);

  try {
    // Ensure temp dir exists and write prompt
    jetpack.dir(tempDir);
    jetpack.write(tempFile, prompt);

    // Build command - pipe from file
    const command = `cat "${tempFile}" | claude -p -`;

    // Log start
    logger.log(`[${targetLang}] Calling Claude CLI...`);

    // Run Claude CLI
    const result = await execute(command);

    // Log response received
    logger.log(`[${targetLang}] Claude CLI responded (${result.length} chars)`);

    // Clean up temp file
    jetpack.remove(tempFile);

    // Parse result - extract JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    // Log success
    logger.log(`[${targetLang}] Parsed JSON successfully`);

    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    // Clean up temp file on error
    jetpack.remove(tempFile);
    throw new Error(`Claude CLI failed: ${e.message}`);
  }
}

// Get full language name
function getLanguageName(code) {
  const names = {
    zh: 'Chinese (Simplified)',
    es: 'Spanish',
    hi: 'Hindi',
    ar: 'Arabic',
    pt: 'Portuguese',
    ru: 'Russian',
    ja: 'Japanese',
    de: 'German',
    fr: 'French',
    ko: 'Korean',
    ur: 'Urdu',
    id: 'Indonesian',
    bn: 'Bengali',
    tl: 'Tagalog/Filipino',
    vi: 'Vietnamese',
    it: 'Italian',
  };

  return names[code] || code;
}

// Export task
module.exports = series(translate);
