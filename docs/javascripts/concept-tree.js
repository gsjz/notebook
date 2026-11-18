(() => {
  const widgets = new WeakMap();
  let widgetId = 0;
  let resizeFrame;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = `concept-tree__${className}`;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(label, className, action) {
    const node = element("button", className, label);
    node.type = "button";
    node.addEventListener("click", action);
    return node;
  }

  function navigationLink(label, className, url, accessibleName = label) {
    const node = element("a", className, label);
    node.href = url.href;
    node.target = "_blank";
    node.rel = "noopener noreferrer";
    node.title = "新标签页打开";
    node.setAttribute("aria-label", `${accessibleName}（新标签页打开）`);
    return node;
  }

  function icon(path) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "concept-tree__icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.5");
    svg.setAttribute("stroke-linecap", "square");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
    shape.setAttribute("d", path);
    svg.append(shape);
    return svg;
  }

  function isText(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function safeURL(value, base) {
    if (!isText(value)) throw new Error("Missing concept tree URL");
    const url = new URL(value, base);
    if (url.origin !== window.location.origin || !/^https?:$/.test(url.protocol)) {
      throw new Error("Concept tree URLs must be same-origin");
    }
    return url;
  }

  function validate(data, sourceURL) {
    if (!data || !isText(data.title) || !data.root) {
      throw new Error("Invalid concept tree");
    }
    const records = new Map();

    function visit(node, parent, depth) {
      if (
        !node || depth > 20 || records.size >= 500 || !isText(node.id) ||
        records.has(node.id) || !isText(node.label) || !isText(node.summary) ||
        (node.noteType !== undefined && !["outline", "index", "explanation"].includes(node.noteType)) ||
        (node.children !== undefined && !Array.isArray(node.children)) ||
        (node.relations !== undefined && !Array.isArray(node.relations))
      ) throw new Error("Invalid concept tree node");
      const record = {
        id: node.id,
        label: node.label,
        summary: node.summary,
        href: node.href === undefined ? null : safeURL(node.href, sourceURL),
        noteType: node.noteType || "explanation",
        relations: node.relations || [],
        parent,
        children: [],
      };
      records.set(record.id, record);
      record.children = (node.children || []).map((child) => visit(child, record, depth + 1));
      return record;
    }

    const root = visit(data.root, null, 0);
    records.forEach((record) => {
      record.relations.forEach((relation) => {
        if (!relation || !records.has(relation.target) || !isText(relation.text)) {
          throw new Error("Invalid concept relation");
        }
      });
    });
    return { title: data.title, root, records };
  }

  function noteLabel(record) {
    return { outline: "框架", index: "目录", explanation: "精讲" }[record.noteType];
  }

  function mount(host, data) {
    const prefix = `concept-tree-${++widgetId}`;
    const overview = host.dataset.conceptMode === "overview";
    const focus = data.records.get(host.dataset.conceptFocus) || data.root;
    const hasFocus = !overview && data.records.has(host.dataset.conceptFocus);
    const requested = overview && data.records.get(new URL(window.location.href).searchParams.get("concept"));
    const views = new Map();
    let selected;
    let branchId = 0;
    let filter = "";
    let savedExpansion;
    const header = element("div", "header");
    const title = element("strong", "title", host.dataset.conceptTitle || data.title);
    const actions = element("div", "actions");
    const reset = button(overview ? "总览" : hasFocus ? "定位本文" : "返回起点", "reset", resetView);
    reset.prepend(icon("M12 3v3m0 12v3M3 12h3m12 0h3M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z"));
    if (host.dataset.conceptOverview) {
      const url = safeURL(host.dataset.conceptOverview, document.baseURI);
      if (hasFocus) url.searchParams.set("concept", focus.id);
      const link = navigationLink("完整概念树", "overview-link", url);
      link.append(icon("M7 17 17 7M7 7h10v10"));
      actions.append(link);
    }
    actions.append(reset);
    const layout = element("div", "layout");
    const branches = element("div", "branches");
    branches.setAttribute("aria-label", "概念层级");
    branches.setAttribute("role", "group");
    branches.tabIndex = 0;
    const detail = element("div", "detail");
    const headingId = `${prefix}-detail`;
    detail.setAttribute("role", "region");
    detail.setAttribute("aria-labelledby", headingId);
    detail.setAttribute("aria-live", "polite");
    detail.setAttribute("aria-atomic", "true");
    header.append(title);
    layout.append(branches, detail);
    const search = element("div", "search");
    const input = element("input", "search-input");
    const results = element("span", "search-status");
    if (overview) {
      input.type = "search";
      input.placeholder = "搜索概念";
      input.setAttribute("aria-label", "搜索概念名称或说明");
      input.autocomplete = "off";
      results.setAttribute("role", "status");
      results.setAttribute("aria-live", "polite");
      search.append(icon("m16 16 5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"), input);
      header.append(search);
      input.addEventListener("input", filterTree);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          input.value = "";
          filterTree();
        }
      });
    }
    header.append(actions);
    host.setAttribute("role", "group");
    if (!host.hasAttribute("aria-label")) host.setAttribute("aria-label", data.title);

    function setExpanded(record, expanded) {
      const view = views.get(record.id);
      if (!view.children) return;
      view.children.hidden = !expanded;
      view.toggle.setAttribute("aria-expanded", String(expanded));
      view.toggle.setAttribute("aria-label", `${expanded ? "收起" : "展开"}${record.label}`);
      view.toggle.textContent = expanded ? "−" : "+";
    }

    function makeList(records) {
      const list = element("ul", "list");
      records.forEach((record) => {
        const item = element("li", "item");
        item.dataset.nodeId = record.id;
        const row = element("div", "row");
        const node = button(record.label, "node", () => select(record));
        node.setAttribute("aria-pressed", "false");
        node.dataset.nodeId = record.id;
        if (hasFocus && record === focus) {
          node.append(element("span", "current", "本文"));
        }
        const view = { node, row, item };
        views.set(record.id, view);
        if (record.children.length) {
          const children = makeList(record.children);
          children.id = `${prefix}-branch-${++branchId}`;
          children.hidden = true;
          const toggle = button("+", "toggle", () => setExpanded(record, children.hidden));
          toggle.setAttribute("aria-expanded", "false");
          toggle.setAttribute("aria-controls", children.id);
          toggle.setAttribute("aria-label", `展开${record.label}`);
          view.children = children;
          view.toggle = toggle;
          row.append(toggle, node);
          item.append(row, children);
        } else {
          const placeholder = element("span", "toggle-placeholder");
          placeholder.setAttribute("aria-hidden", "true");
          row.append(placeholder, node);
          item.append(row);
        }
        if (overview && record.href) {
          const label = noteLabel(record);
          const link = navigationLink(`${label} ↗`, "note-link", record.href, `阅读${label}：${record.label}`);
          row.append(link);
        }
        list.append(item);
      });
      return list;
    }

    function ancestors(record) {
      const path = [];
      for (let parent = record.parent; parent; parent = parent.parent) path.unshift(parent);
      return path;
    }

    function reveal(record) {
      ancestors(record).forEach((parent) => setExpanded(parent, true));
      setExpanded(record, true);
    }

    function scrollToNode(record) {
      const row = views.get(record.id).row;
      const viewport = branches.getBoundingClientRect();
      const bounds = row.getBoundingClientRect();
      if (bounds.top < viewport.top) branches.scrollTop -= viewport.top - bounds.top;
      else if (bounds.bottom > viewport.bottom) branches.scrollTop += bounds.bottom - viewport.bottom;
    }

    function select(record, navigate = false) {
      // Related concepts may be outside an active filter; reveal them in the full tree.
      if (navigate && filter) {
        input.value = "";
        filterTree();
      }
      if (selected) views.get(selected.id).node.setAttribute("aria-pressed", "false");
      selected = record;
      const view = views.get(record.id);
      view.node.setAttribute("aria-pressed", "true");
      if (navigate) reveal(record);
      else setExpanded(record, true);
      host.dataset.conceptSelected = record.id;
      if (overview) {
        const url = new URL(window.location.href);
        if (record === data.root) url.searchParams.delete("concept");
        else url.searchParams.set("concept", record.id);
        window.history.replaceState(window.history.state, "", url.href);
      }
      const path = element("p", "path", ancestors(record).map((parent) => parent.label).join(" / "));
      path.hidden = !record.parent;
      const heading = element("strong", "heading", record.label);
      heading.id = headingId;
      detail.replaceChildren(path, heading, element("p", "summary", record.summary));
      if (record.href && (record.href.pathname !== window.location.pathname || record.href.search || record.href.hash)) {
        const label = noteLabel(record);
        const link = navigationLink(`查看${label} ↗`, "link", record.href, `查看${label}：${record.label}`);
        detail.append(link);
      }
      if (record.relations.length) {
        const relations = element("div", "relations");
        relations.setAttribute("role", "group");
        relations.setAttribute("aria-label", "相关概念");
        record.relations.forEach((relation) => {
          const target = data.records.get(relation.target);
          const control = button("", "relation", () => select(target, true));
          control.append(
            element("span", "relation-target", `${target.label} →`),
            element("span", "relation-text", relation.text)
          );
          relations.append(control);
        });
        detail.append(relations);
      }
      if (navigate) {
        view.node.focus({ preventScroll: true });
        scrollToNode(record);
      }
    }

    function resetView() {
      if (overview) {
        input.value = "";
        filter = "";
        savedExpansion = undefined;
        results.textContent = "";
        views.forEach((view) => { view.item.hidden = false; });
      }
      data.records.forEach((record) => setExpanded(record, false));
      const start = overview ? data.root : focus;
      reveal(start);
      if (overview) {
        const initial = host.dataset.conceptExpanded;
        const records = initial === undefined ? data.root.children : initial.split(/\s+/).map((id) => data.records.get(id)).filter(Boolean);
        records.forEach((record) => reveal(record));
      }
      select(start);
      scrollToNode(start);
    }

    function filterTree() {
      const query = input.value.trim().toLocaleLowerCase();
      if (query && !filter) {
        savedExpansion = new Map();
        views.forEach((view, id) => {
          if (view.children) savedExpansion.set(id, !view.children.hidden);
        });
      }
      filter = query;
      if (!query) {
        views.forEach((view) => { view.item.hidden = false; });
        if (savedExpansion) savedExpansion.forEach((expanded, id) => setExpanded(data.records.get(id), expanded));
        savedExpansion = undefined;
        results.textContent = "";
        if (selected) reveal(selected);
        return;
      }
      const matches = Array.from(data.records.values()).filter((record) =>
        `${record.label} ${record.summary}`.toLocaleLowerCase().includes(query)
      );
      const visible = new Set();
      matches.forEach((record) => {
        visible.add(record.id);
        ancestors(record).forEach((parent) => visible.add(parent.id));
      });
      views.forEach((view, id) => {
        view.item.hidden = !visible.has(id);
        setExpanded(data.records.get(id), true);
      });
      results.textContent = matches.length ? `${matches.length} 个匹配` : "未找到匹配概念";
      branches.scrollTop = 0;
    }

    if (overview) branches.append(results);
    branches.append(makeList([data.root]));
    host.replaceChildren(header, layout);
    if (requested) {
      reveal(requested);
      select(requested);
      scrollToNode(requested);
    } else {
      resetView();
    }
    const reposition = () => {
      if (host.isConnected && selected && views.get(selected.id).node.getClientRects().length) {
        scrollToNode(selected);
      }
    };
    widgets.get(host).reposition = reposition;
    requestAnimationFrame(reposition);
    host.dataset.state = "ready";
    host.dispatchEvent(new CustomEvent("concept-tree:ready", { bubbles: true }));
  }

  async function load(host) {
    const state = widgets.get(host) || {};
    if (state?.loading || host.dataset.state === "ready") return;
    state.loading = true;
    widgets.set(host, state);
    host.dataset.state = "loading";
    host.setAttribute("aria-busy", "true");
    host.querySelector(".concept-tree__error")?.remove();
    try {
      const sourceURL = safeURL(host.dataset.conceptSrc, document.baseURI);
      const response = await fetch(sourceURL, { credentials: "same-origin" });
      if (!response.ok) throw new Error("Could not load concept tree");
      safeURL(response.url, sourceURL);
      const data = validate(await response.json(), sourceURL);
      if (!host.isConnected) return;
      mount(host, data);
    } catch {
      if (!host.isConnected) return;
      host.dataset.state = "error";
      const error = element("div", "error");
      error.setAttribute("role", "status");
      error.append(
        element("p", "error-message", "概念树暂未加载，可阅读下方的静态提纲，或重新加载。"),
        button("重新加载", "retry", () => load(host))
      );
      host.append(error);
      const fallback = document.getElementById(host.dataset.printFallback);
      if (fallback instanceof HTMLDetailsElement && fallback.classList.contains("notebook-interactive-fallback")) {
        fallback.open = true;
      }
    } finally {
      state.loading = false;
      host.removeAttribute("aria-busy");
    }
  }

  function init() {
    document.querySelectorAll(".concept-tree[data-concept-src]").forEach(load);
  }

  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      document.querySelectorAll('.concept-tree[data-state="ready"]').forEach((host) => {
        widgets.get(host)?.reposition?.();
      });
    });
  });

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(init);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
