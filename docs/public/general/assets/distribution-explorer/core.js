(() => {
  const ROOT_SELECTOR = "[data-distribution-explorer]";
  const FUNCTION_PLOT_SCRIPT_ID = "function-plot-distribution-explorer-script";
  const FUNCTION_PLOT_SRC =
    "https://cdn.jsdelivr.net/npm/function-plot@1.25.4/dist/function-plot.js";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const api = window.DistributionExplorer;
  const { clamp, clampInteger, formatNumber } = api.utils;
  const DISTRIBUTIONS = api.definitions;
  const DISTRIBUTION_BY_ID = new Map(
    DISTRIBUTIONS.map((distribution) => [distribution.id, distribution])
  );

  let functionPlotReadyPromise;

  function loadFunctionPlot() {
    if (window.functionPlot) {
      return Promise.resolve();
    }

    if (functionPlotReadyPromise) {
      return functionPlotReadyPromise;
    }

    functionPlotReadyPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById(FUNCTION_PLOT_SCRIPT_ID);
      if (existingScript?.dataset.loaded === "true") {
        resolve();
        return;
      }

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.id = FUNCTION_PLOT_SCRIPT_ID;
      script.src = FUNCTION_PLOT_SRC;
      script.defer = true;
      script.addEventListener(
        "load",
        () => {
          script.dataset.loaded = "true";
          resolve();
        },
        { once: true }
      );
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });

    return functionPlotReadyPromise;
  }

  function normalizeState(definition, state) {
    for (const control of definition.controls) {
      const value = Number(state[control.key]);
      state[control.key] =
        control.step >= 1
          ? clampInteger(value, control.min, control.max)
          : clamp(value, control.min, control.max);
    }

    if (definition.normalizeState) {
      definition.normalizeState(state, api.utils);
    }
  }

  function formatControlValue(value) {
    return Number.isInteger(value) ? String(value) : formatNumber(value);
  }

  function getThemeColors() {
    const schemeElement = document.querySelector("[data-md-color-scheme]");
    const scheme = schemeElement?.getAttribute("data-md-color-scheme") || "default";
    const isDark = scheme === "slate";

    return {
      accent: isDark ? "#22c55e" : "#15803d",
      fill: isDark ? "rgba(34, 197, 94, 0.22)" : "rgba(21, 128, 61, 0.16)",
      mean: isDark ? "#f59e0b" : "#d97706",
      axis: isDark ? "rgba(229,231,235,0.64)" : "rgba(31,41,55,0.64)",
      grid: isDark ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.12)",
      text: isDark ? "#e5e7eb" : "#1f2937",
      muted: isDark ? "#9ca3af" : "#6b7280",
    };
  }

  function getDistributionModel(definition, state) {
    const base = {
      id: definition.id,
      label: definition.label,
      kindLabel: definition.kindLabel,
      formula: definition.formula,
      summary: definition.summary,
    };

    return definition.getModel(base, state);
  }

  function setThemeVariables(root, colors) {
    root.style.setProperty("--distribution-accent", colors.accent);
    root.style.setProperty("--distribution-fill", colors.fill);
    root.style.setProperty("--distribution-mean", colors.mean);
    root.style.setProperty("--distribution-axis", colors.axis);
    root.style.setProperty("--distribution-grid", colors.grid);
    root.style.setProperty("--distribution-text", colors.text);
    root.style.setProperty("--distribution-muted", colors.muted);
  }

  function renderStats(root, data) {
    root.querySelector("[data-stat='kind']").textContent = data.kindLabel;
    root.querySelector("[data-stat='mean']").textContent = formatNumber(data.mean);
    root.querySelector("[data-stat='variance']").textContent = formatNumber(data.variance);
    root.querySelector("[data-stat='support']").textContent = data.support;
  }

  function updateControls(root, definition, state, model) {
    root.querySelector("[data-distribution-title]").textContent =
      `${model.label}分布 ${model.formula}`;
    root.querySelector("[data-distribution-summary]").textContent = model.summary;

    for (const config of definition.controls) {
      const input = root.querySelector(`[data-input="${config.key}"]`);
      const output = root.querySelector(`[data-output="${config.key}"]`);
      input.max = String(config.max);
      input.value = String(state[config.key]);
      output.textContent = formatControlValue(state[config.key]);
    }
  }

  function createSvgElement(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }
    return element;
  }

  function appendText(svg, text, attributes) {
    const node = createSvgElement("text", attributes);
    node.textContent = text;
    svg.appendChild(node);
    return node;
  }

  function renderDiscretePlot(host, model, width, height) {
    const margin = { top: 28, right: 24, bottom: 48, left: 54 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const [xMin, xMax] = model.xDomain;
    const [yMin, yMax] = model.yDomain;
    const xScale = (x) => margin.left + ((x - xMin) / (xMax - xMin)) * innerWidth;
    const yScale = (y) =>
      margin.top + innerHeight - ((y - yMin) / (yMax - yMin)) * innerHeight;
    const svg = createSvgElement("svg", {
      viewBox: `0 0 ${width} ${height}`,
      width: "100%",
      height: "100%",
      class: "distribution-explorer__svg",
      role: "img",
      "aria-label": `${model.label}分布概率质量函数`,
    });
    const plotBottom = margin.top + innerHeight;
    const plotRight = margin.left + innerWidth;
    const xStep =
      model.points.length > 1 ? xScale(model.points[1].x) - xScale(model.points[0].x) : 16;
    const barWidth = clamp(xStep * 0.62, 2, 24);

    host.replaceChildren(svg);

    for (let index = 0; index <= 5; index += 1) {
      const y = yMax * (index / 5);
      const yPosition = yScale(y);
      svg.appendChild(
        createSvgElement("line", {
          x1: margin.left,
          y1: yPosition,
          x2: plotRight,
          y2: yPosition,
          class: "distribution-explorer__grid-line",
        })
      );
      appendText(svg, formatNumber(y), {
        x: margin.left - 9,
        y: yPosition + 4,
        class: "distribution-explorer__tick-label",
        "text-anchor": "end",
      });
    }

    const tickEvery = Math.max(1, Math.ceil(model.points.length / 10));
    for (let index = 0; index < model.points.length; index += tickEvery) {
      const point = model.points[index];
      const xPosition = xScale(point.x);
      svg.appendChild(
        createSvgElement("line", {
          x1: xPosition,
          y1: plotBottom,
          x2: xPosition,
          y2: plotBottom + 5,
          class: "distribution-explorer__axis-line",
        })
      );
      appendText(svg, String(point.x), {
        x: xPosition,
        y: plotBottom + 20,
        class: "distribution-explorer__tick-label",
        "text-anchor": "middle",
      });
    }

    svg.appendChild(
      createSvgElement("line", {
        x1: margin.left,
        y1: plotBottom,
        x2: plotRight,
        y2: plotBottom,
        class: "distribution-explorer__axis-line",
      })
    );
    svg.appendChild(
      createSvgElement("line", {
        x1: margin.left,
        y1: margin.top,
        x2: margin.left,
        y2: plotBottom,
        class: "distribution-explorer__axis-line",
      })
    );

    if (model.mean !== null && model.mean >= xMin && model.mean <= xMax) {
      const meanX = xScale(model.mean);
      svg.appendChild(
        createSvgElement("line", {
          x1: meanX,
          y1: margin.top,
          x2: meanX,
          y2: plotBottom,
          class: "distribution-explorer__mean-line",
        })
      );
      appendText(svg, "μ", {
        x: meanX + 5,
        y: margin.top + 12,
        class: "distribution-explorer__mean-label",
      });
    }

    for (const point of model.points) {
      const x = xScale(point.x) - barWidth / 2;
      const y = yScale(point.y);
      const heightValue = Math.max(1, plotBottom - y);
      const bar = createSvgElement("rect", {
        x,
        y,
        width: barWidth,
        height: heightValue,
        rx: Math.min(3, barWidth / 2),
        class: "distribution-explorer__bar",
      });
      const title = createSvgElement("title");
      title.textContent = `k=${point.x}, probability=${formatNumber(point.y)}`;
      bar.appendChild(title);
      svg.appendChild(bar);
    }

    appendText(svg, model.xLabel, {
      x: plotRight,
      y: height - 10,
      class: "distribution-explorer__axis-label",
      "text-anchor": "end",
    });
    appendText(svg, model.yLabel, {
      x: margin.left + 8,
      y: margin.top - 12,
      class: "distribution-explorer__axis-label",
      "text-anchor": "start",
    });
  }

  function renderContinuousPlot(host, model, colors, width, height) {
    const annotations = [];

    if (
      model.mean !== null &&
      model.mean >= model.xDomain[0] &&
      model.mean <= model.xDomain[1]
    ) {
      annotations.push({ x: model.mean, text: "μ" });
    }

    host.replaceChildren();
    window.functionPlot({
      target: host,
      width,
      height,
      grid: true,
      xAxis: {
        domain: model.xDomain,
        label: model.xLabel,
      },
      yAxis: {
        domain: model.yDomain,
        label: model.yLabel,
      },
      tip: {
        xLine: true,
        yLine: false,
        renderer: (x, y) => `x=${formatNumber(x)}, density=${formatNumber(y)}`,
      },
      annotations,
      data: [
        {
          title: model.name,
          fn: (scope) => model.pdf(scope.x),
          graphType: "polyline",
          sampler: "builtIn",
          closed: true,
          range: model.range,
          nSamples: Math.max(520, width),
          color: colors.accent,
          renderer: (x, y) => `x=${formatNumber(x)}, density=${formatNumber(y)}`,
          attr: {
            "stroke-width": 2.4,
          },
        },
      ],
    });
  }

  function renderPlot(root, model) {
    const host = root.querySelector("[data-plot]");
    const colors = getThemeColors();
    const width = Math.max(320, Math.floor(host.clientWidth || root.clientWidth || 720));
    const height = 360;

    setThemeVariables(root, colors);

    if (model.plotKind === "discrete") {
      renderDiscretePlot(host, model, width, height);
      renderStats(root, model);
      return;
    }

    renderContinuousPlot(host, model, colors, width, height);
    renderStats(root, model);
  }

  function initExplorer(root) {
    if (root.dataset.distributionExplorerReady === "true") {
      return;
    }

    const definition = DISTRIBUTION_BY_ID.get(root.dataset.initialDistribution);
    if (!definition) {
      root.classList.add("distribution-explorer--error");
      root.textContent = "未指定可用的分布图像。";
      return;
    }

    const state = Object.fromEntries(
      definition.controls.map((control) => [control.key, control.value])
    );

    root.dataset.distributionExplorerReady = "true";
    root.innerHTML = `
      <div class="distribution-explorer__header">
        <div class="distribution-explorer__intro">
          <p class="distribution-explorer__eyebrow">probability distribution</p>
          <h3 data-distribution-title>常见分布图像</h3>
          <p data-distribution-summary class="distribution-explorer__summary"></p>
        </div>
      </div>
      <div class="distribution-explorer__controls">
        ${definition.controls
          .map(
            (control) => `
              <label class="distribution-explorer__control" data-control="${control.key}">
                <span><span data-label="${control.key}">${control.label}</span><output data-output="${control.key}">${control.value}</output></span>
                <input data-input="${control.key}" type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${control.value}">
              </label>
            `
          )
          .join("")}
      </div>
      <div class="distribution-explorer__plot-wrap">
        <div class="distribution-explorer__plot" data-plot aria-label="概率分布交互图像">图像加载中...</div>
      </div>
      <dl class="distribution-explorer__stats">
        <div><dt>类型</dt><dd data-stat="kind">-</dd></div>
        <div><dt>均值</dt><dd data-stat="mean">-</dd></div>
        <div><dt>方差</dt><dd data-stat="variance">-</dd></div>
        <div><dt>取值范围</dt><dd data-stat="support">-</dd></div>
      </dl>
    `;

    let resizeFrame = 0;
    let lastWidth = 0;
    let renderVersion = 0;

    function update() {
      normalizeState(definition, state);
      const model = getDistributionModel(definition, state);
      updateControls(root, definition, state, model);

      if (model.plotKind === "continuous" && !window.functionPlot) {
        const host = root.querySelector("[data-plot]");
        const version = (renderVersion += 1);
        host.textContent = "图像加载中...";
        loadFunctionPlot()
          .then(() => {
            if (version === renderVersion) {
              renderPlot(root, model);
              lastWidth = Math.floor(root.getBoundingClientRect().width);
            }
          })
          .catch((error) => {
            console.error("function-plot load failed", error);
            root.classList.add("distribution-explorer--error");
            host.textContent = "连续型分布图像加载失败。";
          });
        return;
      }

      renderVersion += 1;
      renderPlot(root, model);
      lastWidth = Math.floor(root.getBoundingClientRect().width);
    }

    function scheduleResizeRender() {
      if (resizeFrame) {
        return;
      }

      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0;
        const nextWidth = Math.floor(root.getBoundingClientRect().width);
        if (Math.abs(nextWidth - lastWidth) > 4) {
          update();
        }
      });
    }

    for (const input of root.querySelectorAll("[data-input]")) {
      input.addEventListener("input", () => {
        state[input.dataset.input] = Number(input.value);
        update();
      });
    }

    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(scheduleResizeRender);
      resizeObserver.observe(root);
    }

    update();
  }

  function initAll() {
    for (const root of document.querySelectorAll(ROOT_SELECTOR)) {
      initExplorer(root);
    }
  }

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(initAll);
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll, { once: true });
    return;
  }

  initAll();
})();
