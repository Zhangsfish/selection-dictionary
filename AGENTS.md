# Selection Dictionary — agent entry point

- A small local-first English → Chinese selection dictionary for reading AI chats. Optimize latency and low-friction reading, not platform growth.
- Read `ADAPTATION_GUIDE.md` next. Read `PROJECT_MEMORY.md` for product intent, `ARCHITECTURE.md` for boundaries, and `TASK.md` for current work. Durable decisions live in `DECISIONS.md`.
- Inspect the requested surface and run baseline verification before editing. Prefer the smallest change; preserve working components and tests.
- Invariants: synchronous local word lookup with zero requests; popup before async translation; one reused popup; version + abort protection on new selection/close; no autoplay; explicitly local English voices only.
- Preserve source phonetic notation. Do not assert standardized transcription or blanket platform privacy guarantees.
- Do not add LLMs, remote translators, backends, accounts, broad site permissions, frameworks or new product features unless explicitly requested. No publishing as part of an audit.
- Verify: `npm ci`, `npm run check`, `npm run test:browser`. Packaging: `npm run package` (Python 3.10+). Full commands and limitations: `README.md` / `VERIFICATION.md`.
- `src/` runtime; `data/` committed dictionary/provenance; `scripts/` tooling; `tests/` fixtures/logic; `verification/` reviewed public evidence. `dist/`, `output/`, raw data, browser state and dependencies are ignored local artifacts.
- Update relevant docs/tests when behavior changes. Add meaningful decisions; keep progress only in TASK. Do not rewrite unrelated solved work.
