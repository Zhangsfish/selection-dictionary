# Verification

Audit date: 2026-09-15. Windows, Node 24.15.0, npm 11.12.1, Python 3.11.7, Chrome 152.0.7977.84. Pinned development dependencies: TypeScript 7.0.2, esbuild 0.28.2, Playwright 1.62.1. Installed Chrome; fresh isolated test profiles.

## Baseline and current checks

Before edits: `npm run check` passed strict typechecking, 14 unit tests and build; `npm run test:browser` passed 20 browser checks. Historical sanitized evidence: `verification/baseline-browser.json`.

After hardening: `npm run check` passed strict typechecking, 17 unit tests and build; `npm run test:browser` passed 21 checks. These load the actual unpacked MV3 extension. Fixture pages at ChatGPT, Claude and Gemini origins verify injection, selection and display; they are not authenticated live-site coverage.

Browser coverage includes 100 repeated selections, zero HTTP requests during word lookup, morphology, same popup host, keyboard and mouse selection, editable guards, streamed DOM text, light/dark mode, viewport edges, narrow viewport, Escape/outside/scroll close, stale translation cancellation, local-only voice refusal and explicit speech wiring.

## Reproduction commands

```sh
npm ci
npm run check
npm run package
npm run test:browser
python scripts/prepare-dictionary.py --download --check
npm run audit
```

After reviewing/staging the source (`git add .`), `npm run verify:clean` exports only the Git index to a fresh ignored directory. It uses a new npm cache, installs dependencies, repeats the commands above, downloads the pinned CSV, compares generated data and build hashes, and packages twice to check identical ZIP output. It clears external Node module overrides and creates a new browser profile. It requires Git, Node/npm, Python on PATH and installed desktop Chrome. No author-specific environment is needed. Raw results: ignored `output/clean-reproduction.json`; reviewed summary: `verification/reproducibility.json` when completed. ZIP byte identity is checked in the same environment; different Python/zlib versions may produce different compressed bytes.

## Measured performance

Current root run, 100 synthetic pointerup samples after dictionary loading: event-to-definition DOM p50 1.0 ms, p95 1.8 ms, maximum 2.4 ms. Next animation-frame callback p50 16.4 ms, p95 16.8 ms. Seven trusted double-click samples: p50 4.0 ms, p95/max 33.6 ms (first popup 33.6 ms). These exclude script loading and are not actual paint measurements or universal guarantees. See `verification/browser.json` for exact samples and method; clean-run timings are recorded separately.

## Failures found and resolved

- Raw phonetic preservation initially failed the dictionary byte comparison. Regeneration restored only original whitespace in two phonetic fields; definitions and morphology aliases were unchanged. New data hash is recorded in data/metadata.json.
- The new browser speech mock initially assigned a plain object to the native utterance voice setter, which correctly rejects non-native voice objects. The isolated-world fixture now mocks the utterance constructor as well. Runtime behavior was not weakened; the repeated browser run passed.
- The source scanner initially matched its own challenge-token pattern. Requiring an actual token value removed this false positive.

## Limits and platform observations

Native Translator exists and returned `downloadable`; UI correctly requests explicit activation. This does not establish whether a model is already on disk. No real model download, translation quality, translation latency or audible TTS output is claimed. Translation completion/cancellation and local-voice wiring use explicit mocks. Live authenticated chat layouts remain unverified. The localService flag is the browser's report of local speech, not an independent OS network audit.

Chrome's platform requirements: https://developer.chrome.com/docs/ai/translator-api . Voice flag semantics: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService . Word lookup continues when translation is unavailable.

## Public evidence and privacy

Only reviewed fixtures and sanitized JSON belong in verification/. All profiles, logs, live-site responses, raw data, builds and scratch output are ignored. `npm run audit` scans indexed plus unignored source for credential patterns, private keys, machine paths, private URLs, challenge tokens, unexpected binaries and runtime network primitives/resources. Manual runtime review found no fetch, remote scripts/fonts, analytics, telemetry or project-operated backend. Translator model downloads and system speech provisioning are platform behavior. The scan is heuristic, not a proof against all possible secrets. The terminology scanner's own search patterns are not product claims.

## Final clean-source outcome

PASS. The reviewed 47-file source snapshot installed with a fresh npm cache, passed 17 unit tests and 21 browser checks, retrieved the pinned 65,933,428-byte CSV and regenerated data byte-for-byte. Content script, source map, dictionary and upstream license hashes matched the working source build. Two packages were identical (1,443,058 bytes). See verification/reproducibility.json for hashes, commands and independent clean-run timings. Subsequent changes are documentation and reviewed evidence only; runtime, dependencies, data and build/test scripts remain those of the tested snapshot.

The final publishable inventory includes reviewed light/dark screenshots and sanitized reports added after that snapshot. No remote or commit has been created. Ignored historical local output remains on disk and must not be shared by copying the entire working directory; share Git-tracked source or the allowlisted extension ZIP.
