# Decisions

历史条目保留。D-003 的 Chrome 114 下限由 D-007 取代；D-004 的外部 Playwright 路径由 D-009 取代。当前行为以最新决策和源码为准。

## D-001 Local-first compact ECDICT
Date: 2026-09-15

Decision: 使用固定版本 ECDICT CSV，取按 min(bnc, frq) 排序的 18,000 个有中文释义的英文 lexical entries，补充验收词；保留 full translation 和 phonetic，并导出 exchange:0 原形映射。JSON 构建进脚本。

Why: 常用词查询可在同一事件中完成，不需要异步存储或后台唤醒；可复现且零运行时网络。

Alternatives considered: SQLite/WASM 增加运行时、初始化与打包复杂度；IndexedDB 增加首次导入和异步查询；按字母 JSON shards 有首个字母查询等待；完整 770,611 行数据不适合每个页面预加载。

Consequences: 接受每个目标页面一份常用词库内存，不覆盖全部生僻词；以后扩库先测内存/冷启动。上游仓库声明 MIT，随产物保留原文许可；研究来源见 notes/research.md。

## D-002 Native document Translator, explicit first-use activation
Date: 2026-09-15

Decision: Chrome Translator API 在 isolated content script 中直接检测/调用，en → zh。模型未准备时展示启用按钮；无 API 或受策略限制时解释状态；不加入 HTTP fallback。

Why: Chrome 文档要求 document 上下文、语言包可用性检测及用户激活；将 UI 与翻译异步状态解耦。

Alternatives considered: service worker 中不可使用此 API；MAIN world bridge 增加页面消息面；offscreen document 引入额外组件和初始化复杂度，只有证实直接调用不够时再评估。

Consequences: 功能可用性受设备/页面政策限制；首次模型下载不是低延迟路径，不承诺首次句子 500 ms。复用模型会话，AbortSignal+版本检查保护连续选择。

## D-003 Single DOM popup and explicit lifecycle
Date: 2026-09-15

Decision: 单一 Shadow DOM，manual popover 使用浏览器 top layer，Chrome 最低版本 114；pointerup 同步响应，selectionchange 使用 rAF 合并。新选择保持节点，滚动关闭。

Why: 隔离页面样式，避免 z-index 竞争；消除每次重建及固定 debounce 延迟。rAF 仅合并键盘/程序选区通知。

Alternatives considered: 引入定位库、React、延迟关闭动画、拖动面板；这些不改善当前核心场景。

Consequences: 弹窗只跟随系统主题；跨 iframe 和 PDF 不支持；对超长多行选区以选择末端定位，而非声称完全不遮任何文本。

## D-004 Minimal TypeScript toolchain and browser tests
Date: 2026-09-15

Decision: TypeScript 类型检查，esbuild 生成单一 IIFE；Node 内建 test runner 测纯逻辑。复用已安装 Playwright 和系统 Chrome，以独立浏览器进程做实际 unpacked 加载测试。

Why: 无运行时依赖，构建和验证可维护。用户明确批准仅在本项目安装 TypeScript/esbuild。

Alternatives considered: 自制 bundler、放弃 TS、安装完整 UI 框架；没有必要。

Consequences: Node.js 24+（测试使用原生 TS type stripping）；Playwright 为外部测试工具，通过环境变量指向现有安装，不作为浏览器运行时依赖。

## D-005 Exact dictionary entry before morphology
Date: 2026-09-15

Decision: 精确词条优先于原形映射和规则；词形回退只接受词库内已存在的候选。短语 gross margin 进入翻译路径。

Why: 防止 saw 等独立词义被粗暴词干化；保留 running 等既有独立义项。音标来自实际返回词条，原形回退时显式标注原形。

Alternatives considered: 一律先词干化；对任何末尾 s/ed/ing 盲目切割；不采用。

Consequences: 不保证所有歧义或不规则变形正确，不把启发式称为完整 lemmatizer。

## D-006 Explicitly local English speech only
Date: 2026-09-15

Decision: 公开版只接受 localService === true 的英文 voice，并显式赋给 utterance；没有候选时不朗读。

Why: 原来的非本地/默认语音 fallback 与公开版隐私目标不一致。

Alternatives considered: 继续浏览器默认选择、增加云语音设置；不采用。

Consequences: 某些设备需先准备系统本地英文语音。我们依赖浏览器报告，不声称独立验证系统服务的所有行为；声卡输出需人工听音。

## D-007 Chrome 138 minimum
Date: 2026-09-15

Decision: manifest 和构建目标提高到 138，对齐官方桌面 Translator API 起始支持版本。

Why: 公共说明包含句子翻译，不能只根据 Popover 下限声称完整支持。

Alternatives considered: 继续 114 作为词典兼容版；本阶段不做旧版本兼容分支。

Consequences: Chrome 138+ 仍须运行时检测设备/模型/页面可用性；版本号不是模型保证，也不表示已测试所有中间版本。

## D-008 Source notation and separate code/data licensing
Date: 2026-09-15

Decision: 原样保留 phonetic，不人为套斜杠或宣称规范转写。原创源码 MIT；ECDICT 固定来源、原文许可和内容溯源说明单独保存。

Why: 来源记号并非保证标准化；代码许可不代表本项目拥有底层词典内容。

Alternatives considered: 自动正规化全部音标、用根 LICENSE 笼统覆盖数据；不采用。

Consequences: 上游词典来源有本项目不能控制的部分，未来商业使用前重新审视溯源。说明不是法律结论。

## D-009 Reproducible source and agent reuse
Date: 2026-09-15

Decision: 提交精简数据和固定 SHA 输入说明；锁定 Playwright 为开发依赖；脚本化打包、源码审计和干净目录复现。AGENTS + ADAPTATION_GUIDE 提供最短修改路径。

Why: 让陌生用户/代理复用已有解法，而不依赖原作者的个人路径、缓存或口头背景。

Alternatives considered: 手动复制依赖/产物、重构全部模块、以增长或商业平台为目标扩展功能；不采用。

Consequences: Node/npm、桌面 Chrome 和数据/打包用 Python 是明确前提。公开证据与 ignored 临时产物分开；本步骤只准备源码，不提交发布操作。
