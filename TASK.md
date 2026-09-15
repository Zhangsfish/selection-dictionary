# Step 2 — GitHub Public Release

Publication in progress. Canonical repository: https://github.com/Zhangsfish/selection-dictionary . Intended release tag: v0.1.0.

Step 1 audit passed. Publication-specific work replaces the repository URL and reruns all audited release gates. Runtime, dictionary and architecture remain unchanged. The initial release commit and artifact will be recorded only after successful publication.

Current gates: npm ci; npm run check; npm run package; npm run test:browser; npm run audit; staged-source npm run verify:clean.

Remaining work: verify existing remote state and access, finish gates, publish main, tag the artifact commit, upload the runtime ZIP, inspect public URLs and downloaded hash, then update this file truthfully. No Chrome Web Store submission or social promotion is included.

Limitations remain those documented in VERIFICATION.md: fixture origins are not authenticated site coverage; model/audio mocks do not prove native translation quality or audible playback.
