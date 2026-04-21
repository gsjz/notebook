(() => {
  const MATHJAX_SCRIPT_ID = "mathjax-script";
  const MATHJAX_SRC = "https://unpkg.com/mathjax@3/es5/tex-mml-chtml.js";

  function configureMathJax() {
    if (window.MathJax) {
      return;
    }

    window.MathJax = {
      tex: {
        inlineMath: [["\\(", "\\)"]],
        displayMath: [["\\[", "\\]"]],
        processEscapes: true,
        processEnvironments: true,
      },
      options: {
        ignoreHtmlClass: ".*|",
        processHtmlClass: "arithmatex",
      },
      startup: {
        typeset: false,
      },
    };
  }

  function typesetMath() {
    if (!window.MathJax?.typesetPromise || !window.MathJax?.startup?.promise) {
      return;
    }

    window.MathJax.startup.promise = window.MathJax.startup.promise
      .then(() => {
        window.MathJax.startup.output.clearCache();
        window.MathJax.typesetClear();
        window.MathJax.texReset();
        return window.MathJax.typesetPromise();
      })
      .catch((error) => {
        console.error("MathJax typeset failed", error);
      });
  }

  function ensureMathJax() {
    configureMathJax();

    if (document.getElementById(MATHJAX_SCRIPT_ID)) {
      typesetMath();
      return;
    }

    const script = document.createElement("script");
    script.id = MATHJAX_SCRIPT_ID;
    script.src = MATHJAX_SRC;
    script.async = true;
    script.addEventListener("load", typesetMath, { once: true });
    document.head.appendChild(script);
  }

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(() => {
      ensureMathJax();
      typesetMath();
    });
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureMathJax, { once: true });
    return;
  }

  ensureMathJax();
})();
