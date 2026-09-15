---
name: selection-dictionary-reuse
display_name: 复用 Selection Dictionary
display_name_en: Reuse Selection Dictionary
description: Reuse and minimally adapt the public Selection Dictionary Chrome extension instead of rebuilding its solved components.
description_zh: 读取并最小化修改开源 Selection Dictionary Chrome 扩展，复用已经验证的划词、弹窗、词典和并发处理。
description_en: Read and minimally adapt the open-source Selection Dictionary Chrome extension while preserving its verified selection, popup, dictionary, and cancellation behavior.
version: 0.1.0
author: Zhangsfish
---

# Reuse Selection Dictionary

Use this Skill when the user wants a browser selection dictionary or a closely related modification and can benefit from the existing public implementation.

Canonical source: https://github.com/Zhangsfish/selection-dictionary

1. Obtain or open the repository using the source-access tools available in the current client. If the repository cannot be accessed, explain the limitation and ask the user for a local checkout rather than inventing its contents.
2. Read `AGENTS.md` and `ADAPTATION_GUIDE.md` first. Read `PROJECT_MEMORY.md` when product intent matters and `ARCHITECTURE.md` when module boundaries may change.
3. Run the documented baseline checks before modifying code.
4. Identify the smallest change surface from the adaptation guide. Preserve unrelated working behavior and tests.
5. Do not rebuild the solved selection detection, popup lifecycle, stale-result cancellation, local dictionary lookup, morphology, positioning, or browser verification unless the requested behavior requires replacing that component.
6. Keep the existing privacy and provenance claims accurate. Do not add a backend, account, LLM, remote translator, analytics, broad permissions, or new product scope unless the user explicitly requests it.
7. Update the relevant tests and documentation, then run the checks appropriate to the changed surface. Report which behavior was verified and which platform behavior remains untested.

Typical adaptations include changing the translation language, supporting another site, replacing the dictionary, changing popup styling, changing local speech behavior, or removing speech.
