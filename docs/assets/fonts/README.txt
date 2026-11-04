# 本地字体

`notoserif/`、`notoserif-math/` 和 `jbmono/` 保存字体原文件及其相对路径样式表，
供简历与笔记打印使用。45 个文件（42 个 WOFF2、3 个 CSS）保持下载时的原始字节，
总计 46,618,632 字节；各 URL 和 SHA256 记录在 `scripts/resume/fonts.lock.json`。

| 目录 | 字体与版本 | 资源来源 | 许可证来源 |
| --- | --- | --- | --- |
| `notoserif/` | Noto Serif SC 2.003-H1 | <https://cdn.shujie.cc/notoserif/setting.css> | <https://github.com/notofonts/noto-cjk/blob/main/Serif/LICENSE> |
| `notoserif-math/` | Noto Serif 2.013，数字与标点范围 | <https://cdn.shujie.cc/notoserif-math/setting.css> | <https://github.com/google/fonts/blob/main/ofl/notoserif/OFL.txt> |
| `jbmono/` | JetBrains Mono 2.304 | <https://cdn.shujie.cc/jbmono/setting.css> | <https://cdn.shujie.cc/jbmono/OFL.txt> |

三套字体均采用 SIL Open Font License 1.1，各目录保留 `OFL.txt` 和版权说明。
其中 `notoserif-math` 是样式表中的数字字体别名，不是 Noto Serif Math 数学字体产品。
`latin-modern/` 的来源与 GUST Font License 单独记录在该目录。

更新三套 Web 字体时，从仓库根目录执行：

```bash
uv run --project scripts/resume --frozen python scripts/resume/fonts.py refresh-lock
```

该命令显式联网更新本地原文件和锁定值；同时核对版本、来源及许可证。正常构建
只读取本地文件，简历所需字符子集保存在构建缓存中，不存入本目录。
