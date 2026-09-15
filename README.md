# Selection Dictionary

Ultra-fast local selection dictionary for reading AI chats. Free and open source under MIT.

## Why this exists

While reading ChatGPT, Claude or Gemini responses in Chinese, I often encounter a few unfamiliar English words or sentences. I only need the meaning and pronunciation of that selection. A whole-page translator adds more machinery than this interruption needs; this project deliberately solves the smaller problem.

## What it does

- Double-click/select a word → Chinese meaning and source phonetic notation（音标）.
- Select a phrase, sentence or paragraph → Chrome on-device translation when available.
- Click the speaker → original English through an explicitly local English voice, or an unavailable message.
- Compact popup, repeated selection, light/dark theme and viewport-aware positioning.
- Local-first; no account, API key, project backend or analytics.

## Who should use this

People with this exact reading problem, and people with a similar problem who want a coding agent to adapt existing working code.

This repository is intentionally designed to be easy for AI coding agents to understand and modify. It is a reusable solution, not a commercial growth or user lock-in project.

## Give this repo to your AI

```text
I found this open-source project:
https://github.com/Zhangsfish/selection-dictionary

It already solves most of my problem.
Please inspect the repository before writing new code.
Read AGENTS.md and ADAPTATION_GUIDE.md first.

My desired changes are:
[describe changes]

Preserve working parts and tests.
Modify the smallest necessary surface instead of rebuilding from scratch.
```

If your need is similar but not identical, give this repository to ChatGPT, Codex, Claude Code, or another coding agent and modify the existing solution instead of rebuilding it from scratch.

## Architecture

One Manifest V3 isolated content script reads document selections. Single words use an in-memory bundled dictionary; multiword text uses a separate Translator service. A single Shadow DOM popover is reused, with version/AbortSignal protection for async results. Speech runs only on clicks. Vanilla TypeScript; no runtime UI framework or background server. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Performance

In the audited Windows/Chrome run, 100 synthetic selection events reached the definition DOM in p50 1.0 ms / p95 1.8 ms; seven trusted mouse samples measured p50 4.0 ms, including a 33.6 ms first popup. Measured timings and exact conditions are in [VERIFICATION.md](VERIFICATION.md), with raw samples under [verification/](verification/). Measurements distinguish trusted mouse events, synthetic rapid-selection events and the next animation-frame callback. They exclude script/dictionary loading and do not prove pixels are displayed. Benchmarks are from the tested environment, not universal guarantees. No native model translation latency is claimed.

## Installation

Prerequisites: Node.js 24+, npm, and installed **desktop Google Chrome 138+**. Python 3.10+ is needed only for dictionary regeneration and ZIP packaging. Use a Python environment whose interpreter is available as `python` (or invoke the Python scripts with `python3`).

Clone https://github.com/Zhangsfish/selection-dictionary using your Git client. From its root:

```sh
npm ci
npm run check
```

Open `chrome://extensions/`, enable Developer mode, choose **Load unpacked**, and select this project's **dist/** folder. Refresh open ChatGPT/Claude/Gemini pages. After rebuilding, reload the extension and refresh those pages again.

Chrome's [Translator documentation](https://developer.chrome.com/docs/ai/translator-api) lists desktop support starting at 138. Availability still depends on the browser/device, page policy and language model. On first use, click **启用本地翻译** if shown; Chrome may download model components. If translation is unavailable, local word lookup still works. Older browser compatibility workarounds are not included.

## Development

```sh
npm run typecheck
npm test
npm run build
npm run test:browser
npm run package
npm run audit
```

`npm ci` installs pinned TypeScript, esbuild and Playwright **development** dependencies. It does not install Chrome. Browser tests use the installed `chrome` channel; no private environment variables, external module directories or personal profiles are required. `HEADED=1` is an optional visible-window switch; `CHROME_CHANNEL` is optional for deliberately testing another installed Chrome channel. Neither is needed for the default commands.

`npm run package` rebuilds and calls the Python standard-library packager. Alternatively run `npm run build` then `python3 scripts/package-extension.py`. The ZIP is written under ignored `output/`, using a fixed file allowlist and deterministic archive metadata.

The compact dictionary is committed; normal builds need no raw CSV or dictionary download. Retrieve the pinned upstream CSV and verify regeneration:

```sh
python scripts/prepare-dictionary.py --download --check
```

To intentionally regenerate files, omit `--check`. The script verifies source and license SHA-256 before generating anything. Python 3.10+ is sufficient; no pip packages are used. See [Dictionary data](#dictionary-data).

## Verification

See [VERIFICATION.md](VERIFICATION.md) for baseline, final tests, clean-source reproduction, timings, failures and limitations.

`npm run test:browser` loads the actual unpacked extension in a fresh Chrome test profile. It tests local fixtures served by request interception at the three supported HTTPS origins. This validates matching/injection and browser interaction, not authenticated live chat layouts. API mocks are separately labeled.

`npm run test:live` is an optional anonymous live-site smoke check; it may encounter security challenges and is not a release gate. It never submits chats or uses an existing profile. All raw output stays ignored.

For a clean-source audit, stage reviewed source (`git add .`) and run `npm run verify:clean`. It exports the Git index into a fresh ignored directory, performs npm ci with a fresh npm cache, checks/builds/packages/tests the extension, downloads and verifies pinned dictionary inputs, and compares output hashes. It does not commit, push, tag or publish. In a normal clone the index is already populated; uncommitted changes must be staged to include them.

## AI-agent adaptation

Start at [AGENTS.md](AGENTS.md), then [ADAPTATION_GUIDE.md](ADAPTATION_GUIDE.md). The guide maps common requests to real files and tests, including what to leave alone. Product intent is in PROJECT_MEMORY.md; current status is in TASK.md.

## Privacy

- Word lookup uses bundled local data, with no network request or background message.
- Multiword text is passed to Chrome's built-in Translator API. Chrome documents translation as on-device, but downloads, availability and browser behavior are platform-managed. A `downloadable` result does not prove that no model exists on disk: Chrome can hide language-pack status until a site creates a translator.
- TTS accepts only English voices for which the browser reports `localService === true`. Empty/remote-only lists do not speak; there is no implicit default or remote fallback. This relies on the browser's [localService classification](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService), not an independent audit of the OS speech provider.
- No project-operated server receives selected text. There is no analytics, telemetry, account, API key, remote font or external runtime script. Translation cache is memory-only and bounded to 32 entries.

These claims describe the extension code, not every network action of Chrome, the OS or the host website. Developer commands can download npm packages/raw dictionary data; optional live tests visit websites. Those are not runtime dictionary requests.

## Dictionary data

Source: [ECDICT](https://github.com/skywind3000/ECDICT), commit `bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b`. The compact artifact contains 18,001 entries, 19,030 lemma aliases and 16,696 entries with phonetic notation; current counts, bytes and hashes are in [data/metadata.json](data/metadata.json).

This is a frequency-selected subset of the 770,611-row upstream CSV, using word/phonetic/Chinese translation, frequency ranks and exchange fields. Phonetic notation is displayed as supplied, not guaranteed standardized transcription; missing notation is labeled. We do not convert it to make it look standardized.

[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) records exact source/license URLs, pipeline and caveat. The upstream MIT notice is preserved in [data/ECDICT-LICENSE.txt](data/ECDICT-LICENSE.txt), separately from [LICENSE](LICENSE) for this project's original code.

The upstream repository is MIT-licensed, but dictionary-content provenance may involve upstream sources beyond this project's control. Revisit provenance before any future commercial use.

## Limitations

- English → Chinese, three sites, top-level document selections. No editor, iframe, PDF, OCR, wordbook or whole-page translation support.
- General definitions can include dated/specialist senses; no context disambiguation or complete rare-word coverage.
- Native model quality/speed and actual audible output remain separate manual checks. Browser fixtures and speech/model mocks cannot establish these.
- Translation is capped at 6,000 characters; Chrome may impose lower quotas. First model preparation is not instant.
- TTS needs a browser-reported local English voice. If a voice list loads later, click again; it will not autoplay.
- Theme follows the OS; page scroll or viewport changes close the popup. Each matching tab has its own dictionary in memory; file size is not a heap-memory benchmark.
- Only the environment recorded in VERIFICATION.md was tested; the declared 138 minimum is based on API documentation, not a full version matrix.
