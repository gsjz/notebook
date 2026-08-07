(() => {
  const DETAILS_SELECTOR = ".md-content .md-typeset details";
  const STORAGE_PREFIX = "notebook:details-state:v1:";
  const READY_ATTR = "data-hot-reload-state-ready";
  const MAX_AGE = 30 * 60 * 1000;

  function getPageKey() {
    return `${window.location.pathname}${window.location.search}`;
  }

  function getStorageKey() {
    return `${STORAGE_PREFIX}${getPageKey()}`;
  }

  function readState() {
    try {
      const raw = window.sessionStorage.getItem(getStorageKey());
      if (!raw) {
        return {};
      }

      const parsed = JSON.parse(raw);
      if (
        typeof parsed !== "object" ||
        !parsed ||
        Date.now() - Number(parsed.updatedAt || 0) > MAX_AGE
      ) {
        window.sessionStorage.removeItem(getStorageKey());
        return {};
      }

      return parsed.items && typeof parsed.items === "object"
        ? parsed.items
        : {};
    } catch {
      return {};
    }
  }

  function writeState(items) {
    try {
      window.sessionStorage.setItem(
        getStorageKey(),
        JSON.stringify({
          updatedAt: Date.now(),
          items,
        })
      );
    } catch {
      // Losing this state is acceptable; the page should keep working normally.
    }
  }

  function getDetailsSignature(details) {
    const summary = details.querySelector(":scope > summary");
    const title = summary?.textContent?.trim().replace(/\s+/g, " ") || "";
    const className = Array.from(details.classList).sort().join(".");
    return `${className}:${title}`;
  }

  function getDetailsKey(details, seen) {
    const signature = getDetailsSignature(details);
    const count = seen.get(signature) || 0;
    seen.set(signature, count + 1);
    return `${signature}:${count}`;
  }

  function collectState() {
    const items = {};
    const detailsBlocks = Array.from(document.querySelectorAll(DETAILS_SELECTOR));
    const seen = new Map();

    detailsBlocks.forEach((details) => {
      items[getDetailsKey(details, seen)] = details.open;
    });

    return items;
  }

  function saveState() {
    writeState(collectState());
  }

  function init() {
    const detailsBlocks = Array.from(document.querySelectorAll(DETAILS_SELECTOR));
    if (!detailsBlocks.length) {
      return;
    }

    const savedItems = readState();
    const seen = new Map();

    detailsBlocks.forEach((details) => {
      const key = getDetailsKey(details, seen);
      if (Object.prototype.hasOwnProperty.call(savedItems, key)) {
        details.open = savedItems[key] === true;
      }

      if (details.getAttribute(READY_ATTR) === "true") {
        return;
      }

      details.setAttribute(READY_ATTR, "true");
      details.addEventListener("toggle", saveState);
    });
  }

  window.addEventListener("pagehide", saveState);

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(init);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
