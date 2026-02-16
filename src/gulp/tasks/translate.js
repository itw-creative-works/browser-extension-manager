// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('translate');
const { query } = require('@anthropic-ai/claude-agent-sdk');
const { series } = require('gulp');
const jetpack = require('fs-jetpack');
const path = require('path');
const crypto = require('crypto');
const JSON5 = require('json5');

// Locale config (shared with audit.js)
const { limits: LOCALE_LIMITS, languages: LANGUAGES } = require('../config/locales.js');

// Paths
const configMessagesPath = path.join(process.cwd(), 'config', 'messages.json');
const configDescriptionPath = path.join(process.cwd(), 'config', 'description.md');
const distLocalesDir = path.join(process.cwd(), 'dist', '_locales');

// Cache paths — translations are persisted in .cache/ so they survive clean
const cacheDir = path.join(process.cwd(), '.cache');
const cacheHashPath = path.join(cacheDir, 'translate.json');
const cacheMessagesDir = path.join(cacheDir, 'translations', 'messages');
const cacheDescriptionDir = path.join(cacheDir, 'translations', 'description');

// Helper: Compute MD5 hash of a string
function hash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

// Helper: Read cache hashes
function readCacheHashes() {
  if (!jetpack.exists(cacheHashPath)) {
    return {};
  }

  try {
    return JSON.parse(jetpack.read(cacheHashPath));
  } catch (e) {
    return {};
  }
}

// Helper: Write cache hashes
function writeCacheHashes(cache) {
  jetpack.dir(cacheDir);
  jetpack.write(cacheHashPath, JSON.stringify(cache, null, 2));
}

// Helper: Check if source has changed since last translation
function hasSourceChanged(cacheKey, content) {
  const cache = readCacheHashes();

  return cache[cacheKey] !== hash(content);
}

// Helper: Update cache hash for a source
function updateCacheHash(cacheKey, content) {
  const cache = readCacheHashes();

  cache[cacheKey] = hash(content);

  writeCacheHashes(cache);
}

// Helper: Read and parse config/messages.json (JSON5 → object)
function readConfigMessages() {
  if (!jetpack.exists(configMessagesPath)) {
    return null;
  }

  try {
    return JSON5.parse(jetpack.read(configMessagesPath));
  } catch (e) {
    logger.error(`Failed to parse config/messages.json: ${e.message}`);
    return null;
  }
}

// Helper: Call Claude Agent SDK and return raw text
async function callClaude(prompt) {
  let result = '';

  for await (const message of query({
    prompt,
    options: {
      model: 'claude-sonnet-4-5-20250929',
      maxTurns: 1,
      allowedTools: [],
      thinking: { type: 'disabled' },
    },
  })) {
    // Collect assistant text
    if (message.type === 'assistant' && message.message?.content) {
      for (const block of message.message.content) {
        if (block.type === 'text') {
          result += block.text;
        }
      }
    }
  }

  logger.log(`Claude responded (${result.length} chars)`);

  return result;
}

// Helper: Parse JSON from Claude response text
function parseJsonResponse(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  return JSON.parse(jsonMatch[0]);
}

// Helper: Parse delimited sections from Claude response
// Expects format: ===LANG_CODE===\ncontent\n===LANG_CODE===\ncontent
function parseDelimitedResponse(text, langCodes) {
  const result = {};

  for (const code of langCodes) {
    const pattern = new RegExp(`===${code}===\\n([\\s\\S]*?)(?=====[a-z]{2}===|$)`);
    const match = text.match(pattern);

    if (match) {
      result[code] = match[1].trim();
    }
  }

  return result;
}

// Helper: Split an object into chunks of a given size
function chunkObject(obj, size) {
  const entries = Object.entries(obj);
  const chunks = [];

  for (let i = 0; i < entries.length; i += size) {
    chunks.push(Object.fromEntries(entries.slice(i, i + size)));
  }

  return chunks;
}

// Deploy cached translations to dist/_locales/
// Always runs (dev + build) so package task has all locale files
async function deployTranslations(complete) {
  // Deploy EN messages from config/messages.json → dist/_locales/en/messages.json
  const enMessages = readConfigMessages();
  if (enMessages) {
    const enDir = path.join(distLocalesDir, 'en');
    jetpack.dir(enDir);
    jetpack.write(path.join(enDir, 'messages.json'), JSON.stringify(enMessages, null, 2));
    logger.log('Deployed config/messages.json → dist/_locales/en/messages.json');
  } else {
    logger.warn('config/messages.json not found or invalid, skipping');
  }

  // Deploy cached message translations → dist/_locales/{lang}/messages.json
  if (jetpack.exists(cacheMessagesDir)) {
    let count = 0;

    for (const lang of Object.keys(LANGUAGES)) {
      const cachedPath = path.join(cacheMessagesDir, `${lang}.json`);

      if (!jetpack.exists(cachedPath)) {
        continue;
      }

      const langDir = path.join(distLocalesDir, lang);
      jetpack.dir(langDir);
      jetpack.copy(cachedPath, path.join(langDir, 'messages.json'), { overwrite: true });
      count++;
    }

    if (count > 0) {
      logger.log(`Deployed ${count} cached message translations to dist/_locales/`);
    }
  }

  // Complete
  return complete();
}

// Translate messages.json into all configured languages
// Only runs in build mode
async function translateMessages(complete) {
  // Only run in build mode
  if (!Manager.isBuildMode()) {
    logger.log('Skipping messages translation (not in build mode)');
    return complete();
  }

  // Log
  logger.log('Starting messages translation...');

  // Read config/messages.json
  const enMessages = readConfigMessages();
  if (!enMessages) {
    logger.warn('config/messages.json not found or invalid, skipping');
    return complete();
  }

  // Check if source has changed
  const sourceContent = jetpack.read(configMessagesPath);
  if (!hasSourceChanged('messages', sourceContent)) {
    logger.log('config/messages.json unchanged since last translation, skipping');
    return complete();
  }

  // Get English keys
  const enKeys = Object.keys(enMessages);
  logger.log(`Found ${enKeys.length} keys in config/messages.json`);

  // Build language list
  const languageList = Object.entries(LANGUAGES)
    .map(([code, name]) => `- "${code}": ${name}`)
    .join('\n');

  // Build character limits info
  const limitsInfo = Object.entries(LOCALE_LIMITS)
    .map(([field, limit]) => `- ${field}: max ${limit} characters`)
    .join('\n');

  logger.log(`Translating messages into ${Object.keys(LANGUAGES).length} languages...`);

  try {
    const translations = parseJsonResponse(await callClaude(`Translate the following Chrome extension messages.json content from English to multiple languages.

TARGET LANGUAGES:
${languageList}

CHARACTER LIMITS (Chrome Web Store requirements):
${limitsInfo}

IMPORTANT RULES:
1. Only translate the "message" field values
2. Keep the "description" field values in English (they are for developers)
3. Keep all JSON keys exactly as they are
4. Return ONLY valid JSON, no markdown, no explanation
5. Preserve any placeholders like $1, $2, etc.
6. IMPORTANT: Respect the character limits above for each field
7. Return a JSON object where each key is the language code and the value is the translated messages object

INPUT (English):
${JSON.stringify(enMessages, null, 2)}

OUTPUT FORMAT:
{
  "zh": { ... translated messages ... },
  "es": { ... translated messages ... },
  ...
}

Output the translated JSON:`));

    // Ensure cache directory exists
    jetpack.dir(cacheMessagesDir);

    let savedCount = 0;

    // Write each translation to cache and dist
    for (const lang of Object.keys(LANGUAGES)) {
      if (!translations[lang]) {
        logger.warn(`[${lang}] No translation returned`);
        continue;
      }

      const content = JSON.stringify(translations[lang], null, 2);

      // Save to cache
      jetpack.write(path.join(cacheMessagesDir, `${lang}.json`), content);

      // Save to dist
      const langDir = path.join(distLocalesDir, lang);
      jetpack.dir(langDir);
      jetpack.write(path.join(langDir, 'messages.json'), content);

      logger.log(`[${lang}] Messages translation saved`);
      savedCount++;
    }

    // Only update cache hash if we saved all translations
    if (savedCount === Object.keys(LANGUAGES).length) {
      updateCacheHash('messages', sourceContent);
    } else {
      logger.warn(`Only ${savedCount}/${Object.keys(LANGUAGES).length} translations saved, not updating cache hash`);
    }
  } catch (e) {
    logger.error(`Messages translation failed: ${e.message}`);
  }

  // Log
  logger.log('Messages translation finished!');

  // Complete
  return complete();
}

// Translate description.md into all configured languages
// Only runs in build mode
async function translateDescription(complete) {
  // Only run in build mode
  if (!Manager.isBuildMode()) {
    logger.log('Skipping description translation (not in build mode)');
    return complete();
  }

  // Log
  logger.log('Starting description translation...');

  // Check if English description exists
  if (!jetpack.exists(configDescriptionPath)) {
    logger.log('config/description.md not found, skipping');
    return complete();
  }

  // Read English description
  const enDescription = jetpack.read(configDescriptionPath);
  if (!enDescription || !enDescription.trim()) {
    logger.warn('config/description.md is empty, skipping');
    return complete();
  }

  // Check if source has changed
  if (!hasSourceChanged('description', enDescription)) {
    logger.log('config/description.md unchanged since last translation, skipping');
    return complete();
  }

  logger.log(`Found config/description.md (${enDescription.length} chars)`);

  // Batch languages into chunks to avoid output size limits
  const BATCH_SIZE = 4;
  const batches = chunkObject(LANGUAGES, BATCH_SIZE);

  logger.log(`Translating description into ${Object.keys(LANGUAGES).length} languages (${batches.length} batches of ${BATCH_SIZE})...`);

  // Ensure cache directory exists
  jetpack.dir(cacheDescriptionDir);

  let totalSaved = 0;

  try {
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const languageList = Object.entries(batch)
        .map(([code, name]) => `- "${code}": ${name}`)
        .join('\n');

      logger.log(`Batch ${i + 1}/${batches.length}: translating ${Object.keys(batch).join(', ')}...`);

      const langCodes = Object.keys(batch);
      const translations = parseDelimitedResponse(await callClaude(`Translate the following Chrome extension store description from English to multiple languages.

TARGET LANGUAGES:
${languageList}

IMPORTANT RULES:
1. Translate ALL text content including emoji labels and descriptions
2. Keep all emojis exactly as they are
3. Preserve the markdown formatting (headers, bold, bullet points, etc.)
4. Keep brand names, product names, and company names in English (e.g., Amazon, Capital One, NordVPN)
5. Maintain the same tone — enthusiastic, conversational, and persuasive
6. Output each translation separated by a delimiter line: ==={lang_code}===
7. Do NOT wrap in JSON or code fences — just raw translated text between delimiters

INPUT (English):
${enDescription}

OUTPUT FORMAT (use exactly this delimiter format):
${langCodes.map((code) => `===${code}===\nFull translated description here...`).join('\n')}

Output the translations now:`), langCodes);

      // Write each translation in this batch to cache
      for (const lang of langCodes) {
        if (!translations[lang]) {
          logger.warn(`[${lang}] No description translation returned`);
          continue;
        }

        jetpack.write(path.join(cacheDescriptionDir, `${lang}.md`), translations[lang]);
        logger.log(`[${lang}] Description translation saved`);
        totalSaved++;
      }
    }

    // Only update cache hash if we saved all translations
    if (totalSaved === Object.keys(LANGUAGES).length) {
      updateCacheHash('description', enDescription);
    } else {
      logger.warn(`Only ${totalSaved}/${Object.keys(LANGUAGES).length} description translations saved, not updating cache hash`);
    }
  } catch (e) {
    logger.error(`Description translation failed: ${e.message}`);
  }

  // Log
  logger.log('Description translation finished!');

  // Complete
  return complete();
}

// Export task
module.exports = series(deployTranslations, translateMessages, translateDescription);
