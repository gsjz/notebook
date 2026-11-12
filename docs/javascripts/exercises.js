(() => {
  const initialized = new WeakSet();
  const requestedFonts = new Set();
  let mathObserver;

  function preloadAnswerMathFonts() {
    if (!document.fonts || !document.getElementById("katex-stylesheet")?.sheet) return;

    // Closed answers can reach print before their math fonts are requested.
    // Load only the faces used by these answers, without revealing the content.
    document.querySelectorAll(".exercise-answer .katex-html *").forEach((element) => {
      const font = getComputedStyle(element).font;
      if (!font.includes("KaTeX") || requestedFonts.has(font)) return;
      requestedFonts.add(font);
      document.fonts.load(font).catch(() => requestedFonts.delete(font));
    });
  }

  document.addEventListener("load", (event) => {
    if (event.target.id === "katex-stylesheet") preloadAnswerMathFonts();
  }, true);

  function init() {
    const answers = document.querySelectorAll("details.exercise-answer");
    answers.forEach((details) => {
      if (initialized.has(details)) return;
      const summary = details.querySelector(":scope > summary");
      if (!summary) return;

      const label = (summary.getAttribute("aria-label") || "显示参考解答").replace(/^(显示|收起)/u, "");
      const updateLabel = () => {
        summary.setAttribute("aria-label", `${details.open ? "收起" : "显示"}${label}`);
      };
      details.addEventListener("toggle", updateLabel);
      initialized.add(details);
      updateLabel();
    });

    mathObserver?.disconnect();
    const article = document.querySelector("article.md-content__inner");
    if (answers.length && article) {
      mathObserver = new MutationObserver(preloadAnswerMathFonts);
      mathObserver.observe(article, { childList: true, subtree: true });
      preloadAnswerMathFonts();
    }
  }

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(init);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
