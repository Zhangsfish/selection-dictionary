# WorkBuddy / SkillHub plan

Research date: 2026-09-16.

## Finding

SkillHub is a plausible agent-side distribution channel for this repository. It is separate from ordinary social posting: a developer submits a packaged Skill, the platform parses and reviews it, and an approved Skill becomes discoverable in WorkBuddy's Skill market for one-click installation.

Official sources reviewed:

- WorkBuddy Skill development and market structure: https://open.workbuddy.cn/docs/skill
- WorkBuddy desktop Skill installation and safety model: https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market
- WorkBuddy asset-review notifications: https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Buddy-App
- CodeBuddy local/project Skill compatibility: https://www.workbuddy.cn/docs/cli/skills
- WorkBuddy pricing, including a personal free experience tier: https://www.workbuddy.cn/docs/workbuddy/Pricing

## Answers

1. **Can individuals publish?** Yes. The open platform explicitly documents personal certification as well as enterprise certification. Personal certification currently requires a mainland China second-generation resident ID card, a real-name-registered phone number, an email address, and mobile face verification. One ID can certify only one personal principal across the platform, and each account can create at most one personal principal.
2. **Is publishing free?** WorkBuddy documents a free personal experience tier. No Skill submission or listing fee was found in the reviewed official documentation. This is not a guarantee that verification, quotas, or future pricing cannot apply.
3. **Package structure:** a ZIP containing one Skill folder with mandatory `SKILL.md`; optional `references/`, `scripts/`, and `templates/`. `SKILL.md` uses YAML frontmatter plus Markdown instructions. Required documented fields are `description`, `description_zh`, `description_en`, `version`, and `author`; `name` and tool policy fields are optional.
4. **Review:** submit the ZIP through the open platform. Parsing occurs first; the asset then enters publication review. Approval/rejection and reasons appear in the open-platform notification center, WorkBuddy messages, and the verified developer email. Approved assets can be published/listed; forced takedown and profile-compliance notices are also documented.
5. **Discoverability:** approved Skills appear in WorkBuddy's Skill market and can be searched and installed. Users can also import a local Skill ZIP directly.
6. **Clients:** WorkBuddy explicitly supports market search/install and local ZIP import. CodeBuddy Code supports the same `SKILL.md` concept for project/user Skills and plugin packaging. The reviewed documentation does not establish that every SkillHub listing is automatically one-click installable in every CodeBuddy client, so that broader claim should not be made.
7. **External GitHub reuse:** the Skill body is Markdown instruction text and may direct an agent to consult references and use available tools. No reviewed rule forbids pointing to a public GitHub repository. Whether the agent can retrieve it depends on the client's available web/Git tools and user authorization.
8. **Requested guidance:** it is technically suitable for a Skill to instruct an agent to read the public repository, start with `AGENTS.md` and `ADAPTATION_GUIDE.md`, preserve tested modules, and adapt rather than rebuild. The Skill should disclose that it relies on an external GitHub source and must not claim that a remote fetch always succeeds.

## Minimal draft

Draft package: `docs/skillhub/selection-dictionary-reuse/SKILL.md`.

Generated upload candidate: `output/skillhub/selection-dictionary-reuse.zip`. Its archive root contains exactly `selection-dictionary-reuse/SKILL.md`. The `output/` directory is intentionally ignored because ZIP packages are generated upload artifacts rather than project source.

It contains instructions only, no executable scripts, credentials, connector, or elevated permissions. The agent fetches the public repository with whatever standard source-access method its client provides, reads the repository's own guidance, and makes the smallest requested change. This is enough to test whether SkillHub improves discovery without duplicating the repository inside a Skill package.

## Publication recommendation

Prepare a ZIP from the single `selection-dictionary-reuse/` folder and validate it in WorkBuddy's local upload flow. If it parses and the instructions behave as expected, submit it through the open platform for review as a separate future step. Login and possibly developer-profile verification will be required. Do not publish it during Step 4B: review status and client behavior should be observed before treating SkillHub as a proven channel.

## Channel distinction

- **WorkBuddy open platform / Skill market:** the asset-submission channel for parsing, review, publication, search, and installation of a Skill.
- **WorkBuddy desktop Skill market:** also exposes `添加技能` → `创建技能`, which starts a conversational skill-creation flow and supports local installation/testing.
- **Tencent Cloud Developer Community:** has WorkBuddy-tagged articles and an OPC community cooperation program, but publishing an article or joining that community does not publish a Skill to the WorkBuddy Skill market.

Current human step: accept the WorkBuddy open-platform developer agreements, log in, and complete personal certification if the console requests it. The prepared ZIP can then be uploaded for parsing; final review submission should remain a separate confirmed action.
