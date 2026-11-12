# 二维码生成器资源

`generator.html` 是笔记内嵌的独立页面，加载同目录的 `generator.css`、`qrcodegen.js` 和 `generator.js`。所有编码在浏览器内完成，无外部运行时依赖。

## 编码库来源

- 项目：[Project Nayuki / QR-Code-generator](https://github.com/nayuki/QR-Code-generator)
- 固定提交：`3c6d0b3cefb4e049dc337e82237c9644399716a8`
- 源文件：[`typescript-javascript/qrcodegen.ts`](https://github.com/nayuki/QR-Code-generator/blob/3c6d0b3cefb4e049dc337e82237c9644399716a8/typescript-javascript/qrcodegen.ts)
- 许可证：MIT，版权和许可声明完整保留在 `qrcodegen.js` 文件头。
- 编译器：TypeScript `5.9.3`。
- `qrcodegen.js` 的 SHA-256：`79f419f267ce5a80d97f8099e0a789a4ecc4697b5348d86371a1f3b2a75d6e03`。

在临时目录保存上述固定版本的 `qrcodegen.ts` 后，执行以下命令可复现浏览器脚本，无需在站点添加 Node 依赖：

```sh
npx --yes --package typescript@5.9.3 tsc --strict \
  --lib DOM,DOM.Iterable,ES6 --target ES6 \
  --outFile qrcodegen.js qrcodegen.ts
```

本站交互脚本统一采用 ECI 26 与 UTF-8 字节段，固定用户选择的纠错等级，自动选择最小可用版本和掩模。SVG 四周保留 4 个模块宽的白色静区。输入修改或编码失败会清除旧结果，防止下载与当前输入不符的图片。
