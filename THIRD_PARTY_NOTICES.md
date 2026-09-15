# Third-party notices

`LICENSE` covers this project's original code. It does not replace licenses or attribution for dictionary content or development dependencies.

## ECDICT dictionary data

- Repository: https://github.com/skywind3000/ECDICT
- Pinned commit: `bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b`
- Source CSV: https://raw.githubusercontent.com/skywind3000/ECDICT/bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b/ecdict.csv
- Exact upstream license: https://raw.githubusercontent.com/skywind3000/ECDICT/bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b/LICENSE
- Verbatim local notice: `data/ECDICT-LICENSE.txt` in source; `ECDICT-LICENSE.txt` in the extension package. Copyright (c) 2025 Linwei, as stated upstream.
- Pinned URLs and SHA-256 digests: `data/source.json`.

The project ships a selected/preprocessed subset, not the full CSV. `scripts/prepare-dictionary.py` reads `word`, `translation`, `phonetic`, `bnc`, `frq`, and `exchange`. It filters English lexical tokens with Chinese definitions, ranks by the smaller positive frequency rank, selects 18,000 entries plus acceptance vocabulary, and extracts applicable `exchange:0` lemma mappings. Other source fields are discarded.

Runtime layout: `entries[word] = [phonetic, translation]` and `aliases[inflection] = lemma`. Word keys are lowercased; escaped definition line breaks are decoded; phonetic notation is retained as supplied, not reformatted as standardized transcription. The committed `data/dictionary.json` is bundled directly into the content script. `data/metadata.json` records actual counts, size and output hash. It currently contains 18,001 entries and 19,030 aliases (1,796,712 bytes); 16,696 entries have phonetic notation. This project does not claim ownership of the underlying dictionary content.

The upstream repository is MIT-licensed, but dictionary-content provenance may involve upstream sources beyond this project's control. Revisit provenance before any future commercial use.

This is a provenance notice, not a legal conclusion or a claim that copyright questions have been resolved.

## Development tools

TypeScript (Apache-2.0), esbuild (MIT), and Playwright (Apache-2.0) are pinned development dependencies in package-lock.json; their own distributions contain their notices. They are not shipped as extension runtime libraries. Node.js and Python are build/test prerequisites. No code or data from the other reference extensions was copied into this repository; research references are in notes/research.md.
