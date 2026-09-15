# 词典数据
- `dictionary.json`：正式提交的精简词库，运行时随脚本内联，无网络查询。
- `metadata.json`：来源提交、筛选规则、词数、大小与 SHA-256；不要手改计数。
- `ECDICT-LICENSE.txt`：上游固定提交许可原文，必须进入 dist。
- `raw/ecdict.csv`：下载的生成输入，gitignored，不进入扩展。
- 使用 `../scripts/prepare-dictionary.py`（Python 标准库）重建；源地址在 metadata 中。
- 词典全文释义和音标保留来源信息；人工修订必须单列来源与理由，不能无记录替换。
- `source.json`：固定上游提交、下载地址、CSV 和许可哈希。`python scripts/prepare-dictionary.py --download --check` 从仓库根目录执行，可下载并核验生成结果。
