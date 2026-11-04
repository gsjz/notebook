(() => {
  const ARTICLE_SELECTOR = "article.md-content__inner";
  const PRINT_FONT = '"Notebook Print Roman", "Notebook Print Serif", serif';
  let printState;
  let fontsReady;

  function loadPrintFonts() {
    if (!fontsReady) {
      fontsReady = Promise.allSettled([
        document.fonts.load('400 14px "Notebook Print Serif"'),
        document.fonts.load('700 14px "Notebook Print Serif"'),
        document.fonts.load('400 14px "Notebook Print Roman"'),
        document.fonts.load('700 14px "Notebook Print Roman"'),
        document.fonts.load('italic 14px "Notebook Print Roman"'),
      ]);
    }
    return fontsReady;
  }

  function addSectionNumbers(article) {
    const headings = Array.from(article.querySelectorAll(":scope > h2, :scope > h3, :scope > h4"));
    // Book notes often mix numbered sections, exercise headings and emphasis.
    // Preserve their hierarchy as a whole instead of adding a second scheme.
    const enumeration = /^(?:\*\s*)?(?:\d+(?:\.\d+)*(?:[.、\s]|$)|[（(]\d+[）)]|[一二三四五六七八九十百]+[、．.]|第[\d一二三四五六七八九十百]+[章节篇])/u;
    if (headings.some((heading) => enumeration.test(heading.textContent.trim()))) {
      return;
    }
    const numbers = [0, 0, 0];
    headings.forEach((heading) => {
      const level = Number(heading.tagName[1]) - 2;
      numbers[level] += 1;
      numbers.fill(0, level + 1);
      heading.dataset.notebookSection = numbers.slice(0, level + 1).filter(Boolean).join(".");
    });
  }

  function cloneSvgPanel(svg, y, height, suffix) {
    const copy = svg.cloneNode(true);
    const box = svg.viewBox.baseVal;
    copy.setAttribute("viewBox", `${box.x} ${y} ${box.width} ${height}`);
    const nodes = [copy, ...copy.querySelectorAll("*")];
    const ids = new Map();
    nodes.filter((node) => node.id).forEach((node) => {
      ids.set(node.id, `${node.id}-print-${suffix}`);
      node.id = ids.get(node.id);
    });
    nodes.forEach((node) => {
      Array.from(node.attributes).forEach(({ name, value }) => {
        const updated = name.startsWith("aria-")
          ? value.split(" ").map((id) => ids.get(id) || id).join(" ")
          : value.replace(/#([\w:-]+)/gu, (reference, id) => ids.has(id) ? `#${ids.get(id)}` : reference);
        if (updated !== value) {
          node.setAttribute(name, updated);
        }
      });
    });
    return copy;
  }

  function addFigureCaptions(article) {
    let number = 0;
    article.querySelectorAll('svg[role="img"]').forEach((svg) => {
      if (svg.closest("figure, .mermaid, .arithmatex, [data-print-fallback]")) {
        return;
      }
      const caption = svg.getAttribute("aria-label") || svg.querySelector("title")?.textContent;
      if (!caption?.trim()) {
        return;
      }
      const figure = document.createElement("div");
      figure.className = "notebook-print-figure";
      const label = document.createElement("p");
      label.className = "notebook-print-caption";
      label.textContent = `图 ${++number}　${caption.trim()}`;
      const parent = svg.parentElement;
      // Markdown wraps standalone SVGs in a paragraph. Replace that wrapper
      // before adding block captions, keeping the resulting HTML valid.
      if (parent.matches("p") && Array.from(parent.childNodes).every((node) => node === svg || (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()))) {
        Array.from(parent.attributes).forEach(({ name, value }) => figure.setAttribute(name, value));
        figure.classList.add("notebook-print-figure");
        parent.replaceWith(figure);
      } else {
        svg.before(figure);
      }
      figure.append(svg, label);
      const split = Number(svg.dataset.printSplitAt);
      const box = svg.viewBox.baseVal;
      if (split > box.y && split < box.y + box.height) {
        figure.classList.add("notebook-print-split-figure");
        [
          [box.y, split - box.y],
          [split, box.y + box.height - split],
        ].forEach(([y, height], index) => {
          const panel = document.createElement("div");
          panel.className = "notebook-print-panel";
          const copy = cloneSvgPanel(svg, y, height, `${number}-${index}`);
          const panelCaption = label.cloneNode(true);
          const heading = Array.from(svg.querySelectorAll('text[font-weight="700"]')).find((text) => {
            const position = Number(text.getAttribute("y"));
            return position > y && position < y + 60;
          });
          const description = heading?.textContent.replace(/^\d+\s*/u, "") || caption.trim();
          panelCaption.textContent = `图 ${number}${index === 0 ? "a" : "b"}　${description}`;
          panel.append(copy, panelCaption);
          figure.append(panel);
        });
      }
    });
    article.querySelectorAll("details").forEach((details) => {
      const contents = Array.from(details.children).filter((child) => child.tagName !== "SUMMARY");
      if (contents.length === 1 && contents[0].classList.contains("notebook-print-figure")) {
        details.classList.add("notebook-print-figure-details");
      }
    });
  }

  function prepareTitle(article) {
    const source = article.querySelector("h1");
    if (!source) {
      return;
    }
    const content = source.cloneNode(true);
    content.querySelectorAll(".headerlink").forEach((link) => link.remove());
    const title = document.createElement("div");
    title.className = "notebook-print-title";
    title.append(...content.childNodes);
    let path = window.location.pathname;
    try {
      path = decodeURI(path);
    } catch {
      // Preserve a path containing malformed percent escapes as displayed.
    }
    const origin = document.createElement("small");
    origin.className = "notebook-print-source";
    origin.textContent = path.replace(/\/+$/u, "") || "/";
    title.append(origin);
    source.before(title);
    source.setAttribute("data-notebook-print-title-source", "");
    return { source, title };
  }

  function addEmbedAlternatives(article) {
    article.querySelectorAll("[data-print-fallback]").forEach((interactive) => {
      const fallback = document.getElementById(interactive.dataset.printFallback);
      if (fallback && article.contains(fallback) && fallback.matches(".notebook-interactive-fallback")) {
        interactive.classList.add("notebook-interactive-live");
      }
    });
    article.querySelectorAll("iframe").forEach((frame) => {
      if (frame.classList.contains("notebook-interactive-live")) {
        // Keep the standalone entry on screen without repeating it on paper.
        article.querySelectorAll("p > a:only-child").forEach((link) => {
          if (link.href === frame.src && link.parentElement.textContent.trim() === link.textContent.trim()) {
            link.parentElement.classList.add("notebook-print-embed-source");
          }
        });
        return;
      }
      const note = document.createElement("p");
      note.className = "notebook-print-embed";
      note.textContent = `交互内容：${frame.title || "在线演示"}（请在线查看）`;
      if (frame.getAttribute("src")) {
        let url;
        try {
          url = new URL(frame.getAttribute("src"), document.baseURI);
        } catch {
          // A malformed source can still have a printable title.
        }
        if (url && ["http:", "https:"].includes(url.protocol)) {
          const link = document.createElement("a");
          link.href = url.href;
          link.textContent = url.href;
          note.append(link);
          const following = frame.nextElementSibling;
          const existing = following?.matches("p") ? following.querySelector("a") : null;
          if (existing?.href === url.href && following.textContent.trim() === existing.textContent.trim()) {
            following.classList.add("notebook-print-embed-source");
          }
        }
      }
      frame.after(note);
    });
  }

  function measureMath(article) {
    const measure = document.createElement("div");
    measure.className = "md-typeset";
    measure.style.cssText = "position:fixed;left:-100000px;top:0;width:max-content;font-size:14px;letter-spacing:normal;visibility:hidden";
    measure.style.fontFamily = PRINT_FONT;
    document.body.append(measure);

    const formulas = Array.from(article.querySelectorAll(".katex-display"));
    formulas.forEach((formula) => {
      const clone = formula.cloneNode(true);
      clone.style.width = "max-content";
      measure.replaceChildren(clone);
      const width = clone.getBoundingClientRect().width;
      if (width > 0) {
        formula.style.setProperty("--notebook-math-width", width);
      }
    });
    measure.remove();
    return formulas;
  }

  function preparePrint() {
    const article = document.querySelector(ARTICLE_SELECTOR);
    if (!article || printState) {
      return;
    }

    printState = {
      details: Array.from(article.querySelectorAll("details:not([open])")),
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      formulas: measureMath(article),
      title: prepareTitle(article),
    };
    document.documentElement.setAttribute("data-notebook-printing", "");
    printState.details.forEach((details) => {
      details.open = true;
    });
  }

  function restorePage() {
    if (!printState) {
      return;
    }

    const saved = printState;
    saved.details.forEach((details) => {
      details.open = false;
    });
    saved.formulas.forEach((formula) => {
      formula.style.removeProperty("--notebook-math-width");
    });
    if (saved.title) {
      saved.title.title.remove();
      saved.title.source.removeAttribute("data-notebook-print-title-source");
    }
    document.documentElement.removeAttribute("data-notebook-printing");
    printState = undefined;
    requestAnimationFrame(() => {
      window.scrollTo({ left: saved.scrollX, top: saved.scrollY, behavior: "instant" });
    });
  }

  function init() {
    const article = document.querySelector(ARTICLE_SELECTOR);
    if (!article || article.querySelector(".notebook-print-button")) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "notebook-print-button";
    button.title = "打印当前笔记或保存为 PDF（交互使用静态图，包含折叠内容和全部标签页）";
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6zM18 12h.01"/></svg><span>打印 / PDF</span>';
    button.addEventListener("pointerenter", loadPrintFonts, { once: true });
    button.addEventListener("focus", loadPrintFonts, { once: true });
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      try {
        await Promise.race([
          loadPrintFonts(),
          new Promise((resolve) => window.setTimeout(resolve, 6000)),
        ]);
        window.print();
      } finally {
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
    });
    addEmbedAlternatives(article);
    addSectionNumbers(article);
    addFigureCaptions(article);
    article.prepend(button);
  }

  window.addEventListener("beforeprint", preparePrint);
  window.addEventListener("afterprint", restorePage);

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(init);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
