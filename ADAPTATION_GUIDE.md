# Adaptation Guide

If you are an AI coding agent modifying this repository:

1. Read AGENTS.md.
2. Read this file.
3. Read PROJECT_MEMORY.md only if product intent matters.
4. Read ARCHITECTURE.md only if changing module boundaries.
5. Run baseline tests before modifications (`npm run check`, then `npm run test:browser` with installed Chrome).
6. Avoid rewriting unrelated working components.

The default UI and dictionary are Chinese. Changing the sentence translator's language does **not** change single-word definitions.

## Change map

| Desired change | Read first | Likely files/modules | Avoid touching |
|---|---|---|---|
| Support another website | manifest matches and selection guards | `manifest.json`, origin loop in `scripts/browser-test.mjs` | dictionary and speech |
| Change target translation language | `languages` and status messages | `src/translation/translator.ts`, `tests/translation.test.ts`; Chinese labels in `src/content/content.ts` and `popup.ts` | popup lifecycle, word data unless requested |
| Replace dictionary source | `THIRD_PARTY_NOTICES.md`, `data/source.json`, schema below | `scripts/prepare-dictionary.py`, `data/`, `src/dictionary/dictionary.ts`, `tests/core.test.ts` | selection and popup lifecycle |
| Change popup appearance | `styles` and static UI template | `src/content/popup.ts`; `src/content/position.ts` for placement | Translator, dictionary pipeline |
| Remove TTS | speech callbacks and button | `src/speech/speech.ts`, wiring in `src/content/content.ts`, speaker button in `popup.ts`, speech tests | dictionary, translator |
| Change speech behavior | explicit local voice policy | `src/speech/speech.ts`, `tests/speech.test.ts`, speech checks in `scripts/browser-test.mjs` | selection |
| Support all webpages | manifest access scope, editable/iframe guards | `manifest.json`, `src/content/selection.ts`, browser origin coverage | dictionary pipeline |
| Change word classifier | `normalizeSelection`, `wordKey`, `lemmaCandidates` | `src/dictionary/normalize.ts`, `tests/core.test.ts` | positioning |
| Add remote translator (only if requested) | `TranslationService.translate` and privacy model | `src/translation/translator.ts`, manifest permissions if needed, privacy docs/tests | selection lifecycle, request identity |

## Reusable solved problems

Do not rebuild these unless the user's requested behavior actually requires replacing them.

- **Selection detection:** `selection.ts` filters editable/empty selections and obtains a Range endpoint without site-specific CSS selectors. Classification is transparent regex-based logic.
- **Popup lifecycle:** `content.ts` coordinates one `DictionaryPopup`; pointerup updates synchronously, internal clicks preserve it, outside/Escape/scroll close it.
- **Rapid repeated selection:** pointerdown invalidates work while retaining the card; pointerup reuses its DOM. Release-over-popup state has a browser regression test.
- **Stale-result cancellation:** `RequestIdentity` increments versions and aborts. Translation checks signals before/after awaits; controller callbacks check version and visibility.
- **Viewport positioning:** pure `popupPosition()` chooses above/below the line, clamps horizontal position, constrains height. Unit/browser tests cover corners and narrow viewports.
- **Local lookup:** `data/dictionary.json` is bundled at build time. Exact properties use `Object.hasOwn`; no storage/message round trip.
- **Morphology:** exact meaning wins, then source aliases, then conservative dictionary-validated suffix candidates. Not a full linguistic model.
- **Translator initialization:** availability, explicit activation, shared creation, progress, retry, reusable instance and 32-entry memory cache already exist.
- **Local TTS:** `localService === true` plus English is required. Empty/remote-only lists show a message. Later voice availability requires another click, never autoplay.
- **Verification:** Node tests; real unpacked MV3 Chrome fixture tests; optional live checks; pinned data regeneration and clean-source reproduction.

## Common adaptation recipes

### 1. Translate sentences into Japanese

Change `languages.targetLanguage` from `zh` to `ja` in `src/translation/translator.ts`. Adjust the en→zh unavailable message there. Update language-pair assertions and mock translations in `tests/translation.test.ts` and the model section of `scripts/browser-test.mjs`. If UI language changes too, inspect `lang="zh-CN"` and labels in `popup.ts`/`content.ts`. Run check/browser tests. Leave selection, cancellation, positioning and speech intact. If the user wants Japanese **word definitions** too, use recipe 3; changing Translator settings does not change the dictionary.

### 2. Add one website

Add a narrow HTTPS match in `manifest.json`; add the origin to the fixture loop in `scripts/browser-test.mjs`. Rebuild, reload and verify selections outside editors. No site class selectors are needed. Document a demonstrated site issue before adding a workaround.

### 3. Replace or expand the dictionary

Review source license/provenance. Pin retrieval input and SHA-256. Modify `scripts/prepare-dictionary.py` or add a source-specific converter emitting `{entries: {word: [phonetic, meaning]}, aliases: {form: base}}`; change `dictionary.ts` only if that contract cannot fit. Update notices, `data/source.json`, generated JSON/metadata and acceptance tests. Build verifies the output hash. Compare startup/lookup costs before expanding significantly.

### 4. Change the compact card's styling

Edit `styles` and, as needed, static markup in `src/content/popup.ts`. Keep textContent for data, one host, manual popover and no delay animation. Run browser tests and inspect light/dark/corner screenshots. Styling does not require replacing selection or translation.

### 5. Remove pronunciation

Remove SpeechPlayer import/creation, stop calls and onSpeak wiring in `content.ts`; remove the speaker control/callback in `popup.ts`. Remove `speech.ts` and related tests/assertions. Adjust README/privacy claims. Preserve definitions, translation and popup close/version behavior.

### 6. Prefer another local English accent

Change priority in `chooseEnglishVoice()` while retaining explicit `localService === true`. Update `tests/core.test.ts` voice priority and `tests/speech.test.ts`. Check no-voice, remote-only, explicit local voice and cancel-before-speak. Never use an implicit browser-default voice.

### 7. Broaden site coverage

All-webpage matches change permissions and exposure. Verify intended http/https scope, editors, iframe exclusion, site CSP and top-layer behavior. Preserve guards and document permission changes. Add representative fixtures/live checks. No dictionary rewrite is needed.

### 8. Add remote translation

Outside current scope; requires explicit user request. Preserve `translate(text, signal, report, activated)` and cancellation semantics; isolate provider configuration. Update data-flow/privacy documentation, permissions and tests before making network claims. Do not put secrets in content scripts or remove the local dictionary path. Add accounts/servers only if explicitly needed.

## Verification shortcuts

- Logic: `npm run check`.
- UI/selection/speech: also `npm run test:browser`; inspect ignored `output/playwright/`.
- Data: `python scripts/prepare-dictionary.py --download --check` after regeneration.
- Release/build: `npm run package`; `npm run audit`; stage reviewed source, then `npm run verify:clean`.
- Commit reviewed evidence from `verification/`, never profiles, live page captures or raw logs from `output/`.

Do not infer native model performance from mocks, audible speech from utterance mocks, or authenticated compatibility from intercepted fixtures. Evidence and limits are in VERIFICATION.md.
