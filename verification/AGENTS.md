# Public verification evidence

- Purpose: reviewed evidence for Step 1 — Public Release Audit. Entry point: ../VERIFICATION.md.
- `baseline-browser.json`: pre-change browser baseline (historical, not current behavior).
- `browser.json`: sanitized final automated fixture checks and timing samples; excludes machine paths and extension IDs.
- `*.png`: reviewed fixture-only screenshots, not personal chat pages.
- `audit.json`: source inventory and audit rule results, never matched secret values.
- `reproducibility.json`: clean-source install/build/data/package/browser outcomes.
- Raw logs, browser profiles, live-site responses and failures stay in ignored ../output/.
- Regeneration commands are documented in ../VERIFICATION.md. Never label mock model/audio results as real output.
- `publication-gates.json`: Step 2 pre-publication gates and artifact hashes; no credentials or local paths.
- `publication-inspection.json`: anonymous GitHub inspection at the v0.1.0 release commit, including downloaded artifact verification; historical release evidence.
