# Milestone 0 研究笔记

核实日期：2026-09-15。只研究满足当前 MVP 所需的模式，不移植大型项目。

| 参考 | 固定版本 / 许可 | 观察与采用 | 不采用 |
|---|---|---|---|
| [Chat Selection Sidekick](https://github.com/yuc036/chat-selection-sidekick) | 5595ea5207d6844cb4d285d3023cadb2dc484d09；MIT | 阅读 content.js：Selection 捕获、附近面板、speechSynthesis cancel/new utterance。采用标准选区及主动发音的思路 | 网络 LLM、解释/追问模式、定时延迟、反复移除面板 |
| [OpenDict](https://github.com/hzyu-hub/browser-extension-OpenDict) | 791a72b3f3be25170e497a7794db95dcac6c2491；MIT | 阅读 content.js：选区和 popup、朗读的英文 voice 选择。参考清晰源文/译文 UI | 远程翻译、API key、词本、PDF、拖动面板、200 ms 关闭动画 |
| [WordWorkshop](https://github.com/atishmish/dictionary_browser_extension) | ebf2a88f36f9c1ff8f588b4e77724a995b84464d；代码 MIT | README 描述全离线、按字母 JSON、stem fallback、内存/存储缓存；采用本地数据与轻量规则方向 | 其英文 Wiktionary 词库不是英中数据；约 60 MB 分片及后台通信不适合常用词首屏。Wiktionary 数据许可与代码 MIT 分开，未复用其数据 |
| [ECDICT](https://github.com/skywind3000/ECDICT) | bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b；仓库 MIT，原文保留在 data/ECDICT-LICENSE.txt | 唯一实际纳入的数据来源：phonetic、translation、bnc/frq、exchange。CSV 实测 65,933,428 bytes、770,611 行。词库输出统计见 data/metadata.json | 不把原始 CSV、SQLite 或百万级释义在网页中全部加载 |
| [Saladict](https://github.com/crimx/ext-saladict) | b93dc3c854aed9898f743109c710f19ababc5369；MIT | 阅读 src/selection/index.ts 与 select-text.ts：区分鼠标按下/释放、selectionchange、Range、面板内选区。采用分离选区捕获模块与鼠标拖选状态 | RxJS/Redux 体系、400 ms 定时 debounce、聚合在线词典和庞大设置系统 |

上述五个项目的 GitHub API license 元数据均为 MIT；对实际再分发的 ECDICT 下载并保留固定提交下 LICENSE 原文。其他参考只用于理解模式，未复制其代码或词库。ECDICT 来源历史包含多种资料，仓库的 MIT 声明不代表本项目逐词重新完成著作权溯源审计。

## ECDICT 数据选择
上游 README 列出 phonetic（以英式音标为主）、translation（中文）、definition（英文）、pos、oxford、collins、tag、bnc、frq、exchange、detail、audio 等字段。audio 不作为可依赖发音资产。运行时发音使用系统 TTS。

采用高频 lexical token 子集，保留完整中文释义，不把示例中“主人翁意识”等特定语境扩展义冒充来源已包含的词义。phonetic 空缺明确显示“音标暂缺”。详见可复现生成脚本与 SHA-256 元数据。

## 浏览器 API 核实
- [Chrome Translator API](https://developer.chrome.com/docs/ai/translator-api)：桌面 Chrome 支持；检查全局 Translator；availability 为 available/downloadable/downloading/unavailable；create 需考虑 user activation；monitor 通知下载进度。目标使用 zh（简体），zh-Hant 为繁体。
- 同一文档说明 Translator 不在 Web Workers 中暴露；默认顶层/同源 iframe，跨源 iframe 受 Permissions Policy 控制；翻译按顺序处理，因此旧请求需要取消。
- [MDN Translator.translate](https://developer.mozilla.org/en-US/docs/Web/API/Translator/translate)：支持 options.signal；需处理 AbortError、InvalidStateError、QuotaExceededError。
- [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)：isolated world 与页面脚本隔离；本扩展保留这个边界，不为模型状态启用 MAIN world 消息桥。
- [MDN speechSynthesis.getVoices](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices)：列表可能稍后才准备好；点击时查询，不等待列表再显示词典。公开版按 D-006 只用显式本地英文 voice，空列表显示不可用，不退回默认语音。
- [Chrome DevTools Extensions domain](https://chromedevtools.github.io/devtools-protocol/tot/Extensions/)：测试使用系统 Chrome 的 Extensions.loadUnpacked，在独立测试进程启用调试；发布扩展不含调试权限。

## 测试报告解释
目标网站 URL 下本地拦截的 fixture 只能证明匹配规则、注入与 DOM 交互，不等同登录后的真实聊天页验收。真实模型未完成验证时，mock 只验证状态机/竞态，不提供真实翻译延迟结论。当前公开验证在 VERIFICATION.md / verification/，原始本机输出在 ignored output/playwright/。
