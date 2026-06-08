(() => {
  const KATEX_SCRIPT_ID = "katex-script";
  const KATEX_AUTORENDER_SCRIPT_ID = "katex-autorender-script";
  const KATEX_STYLESHEET_ID = "katex-stylesheet";
  const KATEX_SRC =
    "https://cdn.jsdelivr.net/npm/katex@0.16.45/dist/katex.min.js";
  const KATEX_AUTORENDER_SRC =
    "https://cdn.jsdelivr.net/npm/katex@0.16.45/dist/contrib/auto-render.min.js";
  const KATEX_CSS_SRC =
    "https://cdn.jsdelivr.net/npm/katex@0.16.45/dist/katex.min.css";
  const KATEX_SCRIPT_INTEGRITY =
    "sha384-Tt7wBxLKwSzFVRET4O4U9H6v8MNaQ/CjN2FMP4xFm0ErrFu6aNqoonRVW5W40iGI";
  const KATEX_AUTORENDER_INTEGRITY =
    "sha384-bjyGPfbij8/NDKJhSGZNP/khQVgtHUE5exjm4Ydllo42FwIgYsdLO2lXGmRBf5Mz";
  const KATEX_CSS_INTEGRITY =
    "sha384-UA8juhPf75SzzAMA/4fo3yOU7sBJ0om7SCD2GHq0fZqZco6tr1UCV7nUbk9J90JM";
  const KATEX_DELIMITERS = [
    { left: "\\(", right: "\\)", display: false },
    { left: "\\[", right: "\\]", display: true },
  ];
  let katexReadyPromise;

  function ensureStylesheet() {
    if (document.getElementById(KATEX_STYLESHEET_ID)) {
      return;
    }

    const link = document.createElement("link");
    link.id = KATEX_STYLESHEET_ID;
    link.rel = "stylesheet";
    link.href = KATEX_CSS_SRC;
    link.integrity = KATEX_CSS_INTEGRITY;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }

  function renderMath() {
    if (
      typeof window.katex === "undefined" ||
      typeof window.renderMathInElement !== "function"
    ) {
      return;
    }

    for (const element of document.querySelectorAll(".arithmatex")) {
      if (element.dataset.katexRendered === "true") {
        continue;
      }

      const source = element.textContent?.trim();
      if (!source) {
        continue;
      }

      element.textContent = source;
      window.renderMathInElement(element, {
        delimiters: KATEX_DELIMITERS,
        throwOnError: false,
      });
      element.dataset.katexRendered = "true";
    }
  }

  function loadScript(id, src, integrity) {
    return new Promise((resolve, reject) => {
      const existingScript = document.getElementById(id);
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
      script.id = id;
      script.src = src;
      script.defer = true;
      script.integrity = integrity;
      script.crossOrigin = "anonymous";
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
  }

  function ensureKatex() {
    ensureStylesheet();

    if (!katexReadyPromise) {
      katexReadyPromise = loadScript(
        KATEX_SCRIPT_ID,
        KATEX_SRC,
        KATEX_SCRIPT_INTEGRITY
      ).then(() =>
        loadScript(
          KATEX_AUTORENDER_SCRIPT_ID,
          KATEX_AUTORENDER_SRC,
          KATEX_AUTORENDER_INTEGRITY
        )
      );
    }

    return katexReadyPromise.then(renderMath).catch((error) => {
      console.error("KaTeX render failed", error);
    });
  }

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(() => {
      ensureKatex();
    });
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureKatex, { once: true });
    return;
  }

  ensureKatex();
})();
