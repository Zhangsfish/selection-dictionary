# 架构

```text
Selection / pointerup / dblclick / keyboard selectionchange
                ↓
content/selection.ts: 读取、过滤编辑器、保存原文及 Range
                ↓
dictionary/normalize.ts: word / text / ignore
                ↓
content/content.ts: 推进 request version、abort 旧工作
                ↓
content/popup.ts: 复用 Shadow DOM + manual popover，先呈现
        ┌───────┴────────┐
        ↓                ↓
dictionary.ts       translation/translator.ts
内存同步查询         availability → 点击准备模型 → translate
        ↓                ↓
中文/音标            检查版本/AbortSignal → 填入译文

speaker click → speech/speech.ts → cancel → 英文 utterance
```

## 扩展组件
只有一个 content script，无 service worker、后端或额外 permissions 项。manifest 的 content_scripts.matches 申请三个目标站点的注入范围，最低桌面 Chrome 138；增加站点必须同步审视访问范围和测试，代码不包含站点类名。

`document_idle` 注入时加载词典并注册轻量监听器，不创建 UI。第一次选择才创建弹窗，之后重复使用。输入框/可编辑区域不处理，默认顶层页面，不跨 iframe。

## 词典层与存储
`data/dictionary.json`：`entries[word] = [phonetic, Chinese translation]`；`aliases[inflection] = lemma`。构建时 esbuild 将数据内联到 content.js，运行时不存在 fetch/IndexedDB/SQLite 路径。查询依次检查精确条目、明确原形映射、有限词尾候选。

每个已打开的目标页面各持有一份内存词典。JSON 字节数不等于堆内存占用，不能据此宣传固定内存大小。原始 CSV 不进入 dist。词典生成脚本记录来源版本、筛选规则、SHA-256、实际词数和音标覆盖率。

`data/source.json` 固定原始数据与许可 URL/SHA-256。`prepare-dictionary.py --download --check` 获取缺失输入并比较生成结果；不允许错误输入挂上固定来源标签。原始 phonetic 保留原样，translation 解码字面换行并裁剪外围空白；数据输出使用 LF。`build.mjs` 校验数据/许可哈希并打包。`package-extension.py` 使用标准库 ZIP，固定文件清单和时间戳，排除无关 dist 文件。

分类位于 `normalize.ts`：归一化空白、保留原文，单个有限长度英文 lexical token（内部可有连字符/撇号）走词典；包含英文的其他非空文本走 Translator，包括 gross margin；纯非英文和空选择忽略。精确词条优先，然后明确原形映射，再尝试有词典依据的词尾候选。

## 翻译层
Translator API 在 content script 的 document 上下文做功能检测，不放进无 DOM 的 service worker。固定 en/zh；多词一律走此层。

状态：unsupported / unavailable / activation / downloading / translating / error / 成功。
未准备模型时展示按钮，点击同步触发 create 以保留 user activation。availability=available 时直接复用/创建会话；NotAllowedError 提供激活按钮。下载进度来自 monitor，不估算下载百分比。失败清理创建状态，允许重试。

downloadable 是 API 报告状态，不能据此推断设备完全没有模型。模型组件下载、设备资格和页面策略由 Chrome 管理。本扩展没有远端翻译适配器。

一个共享初始化 promise，一个已准备会话；每次 translate 传入 AbortSignal。关闭/新选择 abort 已提交翻译，异步前后再次验证。最多 32 个译文存内存，无磁盘记录、HTTP fallback 或遥测。限制 6,000 字符以免误选整页占满本地模型队列；模型自己的 quota 错误独立提示。

## 交互及竞态
pointerdown 立即使旧请求失效，但保留弹窗节点；pointerup 读取已完成选择并同步更新。dblclick 作为补充，sameSelection 去重。键盘和程序修改 Selection 合并到下一个 animation frame；没有用于掩盖竞态的定时延迟。

关闭操作记录 dismissed selection，防止同一个选区的延迟 selectionchange 重新弹出；新用户选择重置。所有异步 UI 写入同时检查请求版本与弹窗仍可见。

定位使用选区末端行（反向选择取起始行）的矩形，优先下方，空间不足时翻到上方，按 visualViewport 限制宽高。弹窗内部可滚动；页面滚动/缩放/resize 关闭，避免漂浮在错误文本旁。

## TTS
只在 speaker 点击时读取语音列表并朗读保存的原始英文。候选必须满足 localService === true 且为英文，优先 en-US，其次其他本地英文；总是显式设置 utterance.voice。没有候选时提示不可用，不创建默认语音朗读。语音稍后到达时也不自动播放，用户可再次点击。新朗读先 cancel，关闭或新选择停止本扩展发起的朗读。真实本地性依赖浏览器/系统报告，实际听音独立验证。

## 验证结构
Node 内建 runner 运行 tests/*.test.ts（Node 24 类型剥离）；TypeScript 检查 src；Playwright 在新 Chrome 配置中用 CDP 加载真实 unpacked 产物，以拦截页面 fixture 验证三个域名、交互与延迟。Translator/TTS 替身只用于控制流程；原生 API 可用性单独记录，live-smoke 是可选匿名检查。

`verify-clean.mjs` 从 Git 索引导出到新目录，重新安装、构建、打包、下载词典、查哈希并运行浏览器检查，不使用个人配置或外部模块路径。`audit-source.mjs` 检查索引及未忽略候选文件；公开 evidence 放 verification，原始日志/配置/站点截图放 ignored output。详细命令和限制见 VERIFICATION.md。
