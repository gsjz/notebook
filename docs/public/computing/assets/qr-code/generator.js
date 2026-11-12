/* Browser-only QR generation using Nayuki's QR Code generator. */
(() => {
  "use strict";

  const form = document.querySelector("#qr-form");
  const textInput = document.querySelector("#qr-text");
  const correctionInput = document.querySelector("#qr-correction");
  const byteCount = document.querySelector("#qr-bytes");
  const status = document.querySelector("#qr-status");
  const output = document.querySelector("#qr-output");
  const details = document.querySelector("#qr-details");
  const downloadButton = document.querySelector("#qr-download");
  const encoder = new TextEncoder();
  let svg = null;

  function clearResult(message, isError = false) {
    svg = null;
    output.replaceChildren();
    details.hidden = true;
    downloadButton.disabled = true;
    status.textContent = message;
    status.dataset.error = String(isError);
  }

  function updateByteCount() {
    const bytes = encoder.encode(textInput.value);
    byteCount.textContent = `UTF-8：${bytes.length} 字节；保留首尾空白。`;
    return bytes;
  }

  function createQrSvg(qr) {
    const ns = "http://www.w3.org/2000/svg";
    const border = 4;
    const side = qr.size + border * 2;
    const result = document.createElementNS(ns, "svg");
    result.setAttribute("viewBox", `0 0 ${side} ${side}`);
    result.setAttribute("width", String(side * 8));
    result.setAttribute("height", String(side * 8));
    result.setAttribute("shape-rendering", "crispEdges");
    result.setAttribute("role", "img");
    result.setAttribute("aria-labelledby", "qr-image-title qr-image-desc");

    const title = document.createElementNS(ns, "title");
    title.id = "qr-image-title";
    title.textContent = "生成的二维码";
    const description = document.createElementNS(ns, "desc");
    description.id = "qr-image-desc";
    description.textContent = `版本 ${qr.version}，${qr.size} × ${qr.size} 个模块，四周保留四模块白边。`;
    result.append(title, description);

    const background = document.createElementNS(ns, "rect");
    background.setAttribute("width", "100%");
    background.setAttribute("height", "100%");
    background.setAttribute("fill", "#fff");
    result.append(background);

    const cells = [];
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (qr.getModule(x, y)) {
          cells.push(`M${x + border},${y + border}h1v1h-1z`);
        }
      }
    }
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", cells.join(""));
    path.setAttribute("fill", "#000");
    result.append(path);
    return result;
  }

  function generate() {
    clearResult("");
    const bytes = updateByteCount();
    if (bytes.length === 0) {
      clearResult("请输入文本或网址。", true);
      return;
    }
    if (typeof qrcodegen === "undefined") {
      clearResult("编码库未能加载，请刷新页面后重试。", true);
      return;
    }

    try {
      const { QrCode, QrSegment } = qrcodegen;
      const levels = {
        L: QrCode.Ecc.LOW,
        M: QrCode.Ecc.MEDIUM,
        Q: QrCode.Ecc.QUARTILE,
        H: QrCode.Ecc.HIGH,
      };
      const segments = [
        QrSegment.makeEci(26),
        QrSegment.makeBytes(Array.from(bytes)),
      ];
      const qr = QrCode.encodeSegments(
        segments, levels[correctionInput.value], 1, 40, -1, false,
      );
      svg = createQrSvg(qr);
      output.replaceChildren(svg);
      document.querySelector("#qr-version").textContent = String(qr.version);
      document.querySelector("#qr-size").textContent = `${qr.size} × ${qr.size}`;
      document.querySelector("#qr-level").textContent = correctionInput.value;
      document.querySelector("#qr-mask").textContent = String(qr.mask);
      details.hidden = false;
      downloadButton.disabled = false;
      status.textContent = "已生成；可扫描预览或下载 SVG。";
    } catch (error) {
      const tooLong = error instanceof RangeError;
      clearResult(tooLong
        ? "内容超出当前纠错等级的容量，请缩短文本或降低纠错等级。"
        : "生成失败，请刷新页面后重试。", true);
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    generate();
  });
  textInput.addEventListener("input", () => {
    updateByteCount();
    clearResult("内容已修改，请重新生成。");
  });
  correctionInput.addEventListener("change", () => {
    clearResult("纠错等级已修改，请重新生成。");
  });
  downloadButton.addEventListener("click", () => {
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "qrcode.svg";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  generate();
})();
