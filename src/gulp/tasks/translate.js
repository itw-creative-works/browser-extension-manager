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
const localesDir = path.join(process.cwd(), 'src', '_locales');
const enMessagesPath = path.join(localesDir, 'en', 'messages.json');
const translationsDir = path.join(process.cwd(), 'packaged', 'translations');
const descriptionDir = path.join(translationsDir, 'description');
const cacheDir = path.join(process.cwd(), '.cache');
const cachePath = path.join(cacheDir, 'translate.json');

// Helper: Compute hash of a string
function hash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

// Helper: Read cache
function readCache() {
  if (!jetpack.exists(cachePath)) {
    return {};
  }

  try {
    return JSON.parse(jetpack.read(cachePath));
  } catch (e) {
    return {};
  }
}

// Helper: Write cache
function writeCache(cache) {
  jetpack.dir(cacheDir);
  jetpack.write(cachePath, JSON.stringify(cache, null, 2));
}

// Helper: Check if source has changed since last translation
function hasSourceChanged(cacheKey, content) {
  const cache = readCache();
  const currentHash = hash(content);

  return cache[cacheKey] !== currentHash;
}

// Helper: Update cache hash for a source
function updateCacheHash(cacheKey, content) {
  const cache = readCache();

  cache[cacheKey] = hash(content);

  writeCache(cache);
}

// Helper: Read and parse config/messages.json
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

// Helper: Call Claude Agent SDK with a prompt and parse JSON from the response
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

  // Parse JSON from response
  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  return JSON.parse(jsonMatch[0]);
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

// Copy config files to src/ locations
// Always runs (dev + build) so distribute task has the latest files
async function copyConfigFiles(complete) {
  // Copy config/messages.json → src/_locales/en/messages.json
  const enMessages = readConfigMessages();
  if (enMessages) {
    jetpack.dir(path.join(localesDir, 'en'));
    jetpack.write(enMessagesPath, JSON.stringify(enMessages, null, 2));
    logger.log('Copied config/messages.json → src/_locales/en/messages.json');
  } else {
    logger.warn('config/messages.json not found or invalid, skipping');
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
    const translations = await callClaude(`Translate the following Chrome extension messages.json content from English to multiple languages.

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

Output the translated JSON:`);

    // Write each translation
    for (const lang of Object.keys(LANGUAGES)) {
      if (!translations[lang]) {
        logger.warn(`[${lang}] No translation returned`);
        continue;
      }

      const langDir = path.join(localesDir, lang);
      const langMessagesPath = path.join(langDir, 'messages.json');

      jetpack.dir(langDir);
      jetpack.write(langMessagesPath, JSON.stringify(translations[lang], null, 2));
      logger.log(`[${lang}] Messages translation saved`);
    }

    // Update cache
    updateCacheHash('messages', sourceContent);
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

  // Ensure description directory exists
  jetpack.dir(descriptionDir);

  try {
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const languageList = Object.entries(batch)
        .map(([code, name]) => `- "${code}": ${name}`)
        .join('\n');

      logger.log(`Batch ${i + 1}/${batches.length}: translating ${Object.keys(batch).join(', ')}...`);

      const translations = await callClaude(`Translate the following Chrome extension store description from English to multiple languages.

TARGET LANGUAGES:
${languageList}

IMPORTANT RULES:
1. Translate ALL text content including emoji labels and descriptions
2. Keep all emojis exactly as they are
3. Preserve the markdown formatting (headers, bold, bullet points, etc.)
4. Keep brand names, product names, and company names in English (e.g., Amazon, Capital One, NordVPN)
5. Maintain the same tone — enthusiastic, conversational, and persuasive
6. Return ONLY valid JSON, no markdown code fences, no explanation
7. Return a JSON object where each key is the language code and the value is the full translated description as a string

INPUT (English):
${enDescription}

OUTPUT FORMAT:
{
${Object.keys(batch).map((code) => `  "${code}": "full translated description here..."`).join(',\n')}
}

Output the translated JSON:`);

      // Write each translation in this batch
      for (const lang of Object.keys(batch)) {
        if (!translations[lang]) {
          logger.warn(`[${lang}] No description translation returned`);
          continue;
        }

        jetpack.write(path.join(descriptionDir, `${lang}.md`), translations[lang]);
        logger.log(`[${lang}] Description translation saved`);
      }
    }

    // Update cache
    updateCacheHash('description', enDescription);
  } catch (e) {
    logger.error(`Description translation failed: ${e.message}`);
  }

  // Log
  logger.log('Description translation finished!');

  // Complete
  return complete();
}

// Export task
module.exports = series(copyConfigFiles, translateMessages, translateDescription);
