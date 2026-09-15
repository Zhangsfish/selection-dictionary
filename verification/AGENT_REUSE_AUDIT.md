# Cold-agent adaptation audit

Mental walkthrough, not an independently executed agent run. Entry path: AGENTS.md → ADAPTATION_GUIDE.md. All five requests have a concrete change surface, preserved boundaries and test path.

| Request | First change surface | Preserve | Verification |
| --- | --- | --- | --- |
| English to Japanese | src/translation/translator.ts sourceLanguage/targetLanguage; popup labels | Selection versions, aborts, popup lifecycle | tests/translation.test.ts language options and races; browser model fixture. Single words still use Chinese dictionary unless separately replaced. |
| Another website | manifest.json matches; browser fixture origins | Dictionary and provider logic | scripts/browser-test.mjs injection and guards on the new origin |
| Popup styling | src/content/popup.ts styles | Selection handling, provider and lifecycle | Browser light/dark, narrow viewport and edge screenshots |
| Replace dictionary | data/source.json, scripts/prepare-dictionary.py, generated data and notices | Lookup contract and selection logic | Data --download --check, tests/core.test.ts, bundle integrity, browser word lookup |
| Remove TTS | src/speech/speech.ts and popup/content call sites listed in guide | Dictionary and Translator cancellation | Update speech-specific tests and browser assertions; preserve all selection checks |

Result: each route can be located without reading the whole codebase. No functioning module was refactored for appearance. The guide explicitly separates language translation from dictionary content and identifies state-machine tests that must survive adaptation.
