# Translations

`npm run build` automatically translates `src/_locales/en/messages.json` to 16 languages via the Claude CLI. Only missing translations are generated — existing translations are preserved.

## Languages produced

`zh`, `es`, `hi`, `ar`, `pt`, `ru`, `ja`, `de`, `fr`, `ko`, `ur`, `id`, `bn`, `tl`, `vi`, `it`

(Output written to `src/_locales/<lang>/messages.json`, then copied to `dist/_locales/` and `packaged/<browser>/raw/_locales/`.)

## How it works

[src/gulp/tasks/translate.js](../src/gulp/tasks/translate.js):

1. Reads `src/_locales/en/messages.json` (source of truth — author all your strings here).
2. For each target language, reads existing `src/_locales/<lang>/messages.json` if present.
3. Computes the set of keys present in `en` but missing (or empty) in the target language.
4. Sends the missing keys to Claude CLI (`@anthropic-ai/claude-agent-sdk`) for translation.
5. Merges results back into the target locale file.

Existing translations are NEVER overwritten — once a key is translated, it stays. Edit the target language file directly if you want to change a translation.

## What gets translated

Keys with a `message` field:

```jsonc
{
  appName: {
    message: 'Tabblar — Workspace & Tab Manager',
    description: 'The name of the extension.'
  },
  appDescription: {
    message: 'Powerful tab and workspace manager...',
    description: 'The description of the extension.'
  }
}
```

The `description` field provides context to the translator (helps Claude pick the right translation when a word is ambiguous).

## Manifest `__MSG_*__` placeholders

`src/manifest.json` references locale keys via `__MSG_<key>__`:

```jsonc
{
  name: '__MSG_appName__',
  description: '__MSG_appDescription__',
}
```

Chrome resolves these at install time using the user's browser locale, falling back to `default_locale` (set in the manifest).

The [test-framework.md](test-framework.md) ships a `locales.test.js` pattern that verifies every `__MSG_*__` placeholder in your manifest has a definition in `messages.json` — catches drift between manifest and i18n catalog before users see broken store listings.

## Disabling translations

Don't want auto-translate? Either:

- Don't have `_locales/en/messages.json` (then there's nothing to translate from), or
- Set the `description` of every key to literal "no-translate" (or comparable convention — adjust `translate.js` to match), or
- Remove the `translate` task from your gulp pipeline (`gulp/main.js` invocation).

## Cost / API key

Translations use Claude via `@anthropic-ai/claude-agent-sdk`. You'll need your Claude CLI authenticated (`claude auth`) or the SDK will fail. For most extensions, the cost is one-time per language per key change — typically pennies.

## See also

- [build-system.md](build-system.md) — gulp pipeline including translate task
- [publishing.md](publishing.md) — auto-publishing to Chrome / Firefox / Edge stores
