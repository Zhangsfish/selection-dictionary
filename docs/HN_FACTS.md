# Hacker News factual source material

Status: Human-writing-required. These are facts only, not a submission draft.

- Repository: https://github.com/Zhangsfish/selection-dictionary
- Problem: Chinese AI-chat answers often contain a few unfamiliar English words or short passages; whole-page translation is more machinery than this narrow interruption needs.
- Functionality: selecting a word shows a Chinese definition and source phonetic notation; selecting multiword text uses Chrome's built-in Translator API where available; an explicit speaker click uses a browser-reported local English voice.
- Architecture: one Manifest V3 isolated content script; bundled in-memory ECDICT subset; one reused Shadow DOM popup; request versions and AbortSignal prevent stale async translation from overwriting newer selections; no project backend, account, API key, analytics, or runtime dictionary request.
- Verified benchmark: after dictionary loading, 100 synthetic selection events reached the definition DOM in p50 1.0 ms and p95 1.8 ms. Seven trusted mouse samples measured p50 4.0 ms, with a 33.6 ms first popup. These are from one Windows/Chrome environment, exclude script loading, and do not measure actual paint.
- Verification: strict TypeScript check, 17 unit tests, 21 actual unpacked-extension browser fixture checks, clean-source dependency install/build/package/data regeneration, and source/privacy audit.
- License: original project source is MIT. ECDICT attribution and its pinned upstream license are separate; dictionary-content provenance may involve upstream sources beyond this project's control and should be revisited before commercial use.
- AGENTS.md is the short entry point for a coding agent. ADAPTATION_GUIDE.md maps common changes to real files, boundaries, and verification paths.
- Known limitations: Chrome desktop 138+ for the advertised Translator experience; only ChatGPT, Claude and Gemini matches; English-to-Chinese; top-level non-editor selections; no PDF/OCR/wordbook; native model quality and audible speech were not established by fixture/mocked tests.
- Reuse idea: an agent can first find code that solves 70%–90% of a personal need, preserve the tested selection/popup/cancellation/dictionary work, and modify only the remaining surface instead of rebuilding solved components and spending more tokens.
