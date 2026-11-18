(() => {
  const DETAILS_SELECTOR = ".md-content .md-typeset details";
  const STORAGE_PREFIX = "notebook:details-state:v1:";
  const READY_ATTR = "data-hot-reload-state-ready";
  const MAX_AGE = 30 * 60 * 1000;
  installLiveReloadGuard();

  function installLiveReloadGuard() {
    if (!window.WebSocket || window.__notebookHotReloadGuard) {
      return;
    }

    // The development server injects its client after this script. Identify
    // that client's listener rather than intercepting application sockets.
    const NativeWebSocket = window.WebSocket;
    const guard = {
      pendingReload: null,
      defer(callback) {
        this.pendingReload = callback;
      },
      flush() {
        const callback = this.pendingReload;
        this.pendingReload = null;
        if (callback) window.setTimeout(callback, 0);
      },
    };
    window.__notebookHotReloadGuard = guard;

    let baseline;
    let active = false;
    let pageVersion = 0;
    let pageUrl = location.href.split("#")[0];
    let timer;
    let checking = false;
    let checkAgain = false;
    let stopped = false;
    let retryDelay = 1500;
    let liveConnection;
    let reconnectTimer;
    const pendingPaths = new Set();
    let checkAll = false;

    function resourcePath(value) {
      const url = new URL(value, location.href);
      return decodeURI(url.pathname);
    }

    async function read(url) {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok || response.redirected) throw new Error("Preview unavailable");
      return response.text();
    }

    async function snapshot() {
      const url = location.href.split("#")[0];
      const source = await read(url);
      const doc = new DOMParser().parseFromString(source, "text/html");
      const article = doc.querySelector("article.md-content__inner");
      if (!article || article.querySelector("h1")?.textContent.trim() === "404 - Not found") {
        throw new Error("Preview page is not ready");
      }
      const resources = new Map();
      doc.querySelectorAll('script[src], link[rel="stylesheet"][href]').forEach((node) => {
        const asset = new URL(node.getAttribute("src") || node.getAttribute("href"), url);
        if (asset.origin === location.origin) {
          resources.set(resourcePath(asset.href), asset.href);
        }
      });
      // The injected connection client is transport state, not note content.
      doc.querySelectorAll('script:not([src])').forEach((node) => {
        if (node.textContent.includes("Waiting for connection") && node.textContent.includes("new WebSocket")) node.remove();
      });
      // Sidebar/navigation changes from other notes must not interrupt this one.
      const html = JSON.stringify([
        doc.head.innerHTML,
        article.outerHTML,
        [...doc.querySelectorAll('script, style, link[rel="stylesheet"]')].map((node) => node.outerHTML),
      ]);
      return { url, html, resources };
    }

    function schedule(path) {
      if (stopped) return;
      if (path) pendingPaths.add(path);
      else checkAll = true;
      window.clearTimeout(timer);
      timer = window.setTimeout(check, 350);
    }

    async function check() {
      if (stopped) return;
      if (checking) { checkAgain = true; return; }
      checking = true;
      const version = pageVersion;
      const all = checkAll;
      const paths = [...pendingPaths];
      pendingPaths.clear();
      checkAll = false;
      try {
        const previous = baseline;
        const current = await snapshot();
        if (version !== pageVersion || current.url !== location.href.split("#")[0]) return;
        if (!previous || previous.url !== current.url) {
          const contents = await Promise.all([...current.resources].map(async ([path, url]) => [path, await read(url)]));
          if (version === pageVersion && current.url === location.href.split("#")[0]) {
            baseline = { ...current, contents: new Map(contents) };
            retryDelay = 1500;
          }
          return;
        }
        if (previous !== baseline) return;
        let changed = current.html !== previous.html;
        const styles = [];
        const assets = all ? [...current.resources.keys()] : paths;
        const updates = await Promise.all(assets.filter((path) => current.resources.has(path)).map(async (path) => {
          const content = await read(current.resources.get(path));
          if (previous.contents.get(path) !== content) {
            if (path.endsWith(".css")) styles.push(path);
            else changed = true;
          }
          return [path, content];
        }));
        if (previous !== baseline || version !== pageVersion || current.url !== location.href.split("#")[0] || stopped) return;
        if (changed) {
          const reload = () => {
            if (baseline !== previous || stopped) return;
            // Verify once more when a print dialog delayed delivery.
            if (document.documentElement.hasAttribute("data-notebook-printing")) {
              guard.defer(() => schedule());
              return;
            }
            saveState();
            location.reload();
          };
          reload();
        } else {
          updates.forEach(([path, content]) => previous.contents.set(path, content));
          styles.forEach((path) => {
            document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
              if (new URL(link.href).origin === location.origin && resourcePath(link.href) === path) {
                const url = new URL(link.href);
                url.searchParams.set("t", Date.now());
                link.href = url.href;
              }
            });
          });
        }
        retryDelay = 1500;
      } catch {
        if (stopped) return;
        checkAll = true;
        window.clearTimeout(timer);
        timer = window.setTimeout(check, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 10000);
      } finally {
        checking = false;
        if (checkAgain) { checkAgain = false; schedule(); }
      }
    }

    function reconnect() {
      if (stopped || !liveConnection || liveConnection.socket.readyState < NativeWebSocket.CLOSING) return;
      window.clearTimeout(reconnectTimer);
      reconnectTimer = window.setTimeout(() => {
        if (stopped) return;
        wrapSocket(new NativeWebSocket(liveConnection.url), liveConnection.url).activate();
      }, 1500);
    }

    function wrapSocket(socket, url) {
      let managed = false;
      const title = document.title;
      const add = socket.addEventListener.bind(socket);
      socket.addEventListener = (type, listener, options) => {
        if (type === "message" && typeof listener === "function") {
          const code = Function.prototype.toString.call(listener);
          if (code.includes("window.location.reload()") && code.includes("decodeURI(window.location.pathname)")) {
            managed = true;
            active = true;
            liveConnection = { socket, url };
            checkAll = true;
            void check();
          }
        }
        add(type, listener, options);
      };
      add("message", (event) => {
        if (!managed) return;
        event.stopImmediatePropagation();
        if (typeof event.data !== "string") return;
        try {
          const path = resourcePath(event.data);
          if (path === resourcePath(location.href) || /\.(?:css|js)$/u.test(path)) schedule(path);
        } catch { /* Ignore malformed development notifications. */ }
      });
      add("open", (event) => {
        if (!managed) return;
        event.stopImmediatePropagation();
        // The stock client changes the title while connecting; undo only that.
        if (document.title === "Waiting for connection") {
          document.title = title;
        }
        schedule();
      });
      add("close", (event) => {
        if (!managed) return;
        event.stopImmediatePropagation();
        reconnect();
      });
      return { socket, activate() {
        managed = true;
        liveConnection = { socket, url };
      } };
    }

    window.WebSocket = new Proxy(NativeWebSocket, {
      construct(Target, args) {
        const socket = new Target(...args);
        try {
          const url = new URL(args[0], location.href);
          if (url.host === location.host && /^wss?:$/u.test(url.protocol) && url.pathname === "/" && !url.search && !url.hash) {
            return wrapSocket(socket, url.href).socket;
          }
        } catch { /* Leave other sockets untouched. */ }
        return socket;
      },
    });
    window.addEventListener("pagehide", () => {
      stopped = true;
      window.clearTimeout(timer);
      window.clearTimeout(reconnectTimer);
    });
    window.addEventListener("pageshow", (event) => {
      stopped = false;
      if (event.persisted && active) {
        reconnect();
        schedule();
      }
    });
    window.addEventListener("afterprint", () => guard.flush());
    if (typeof document$ !== "undefined" && document$.subscribe) {
      document$.subscribe(() => {
        const url = location.href.split("#")[0];
        if (url !== pageUrl) {
          pageUrl = url;
          pageVersion += 1;
          baseline = null;
          guard.pendingReload = null;
          pendingPaths.clear();
          if (active) schedule();
        }
      });
    }
  }

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
    const className = Array.from(details.classList)
      .filter((name) => name !== "notebook-print-figure-details")
      .sort().join(".");
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
    if (document.documentElement.hasAttribute("data-notebook-printing")) {
      return;
    }
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
