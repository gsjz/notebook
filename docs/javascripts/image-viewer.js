(() => {
  const READY_ATTR = "data-image-viewer-ready";
  const VIEWER_ID = "image-viewer";
  const IMAGE_SELECTOR =
    ".md-content .md-typeset img:not(.image-viewer__image)";
  const IMAGE_HREF_PATTERN = /\.(avif|gif|jpe?g|png|svg|webp)([?#].*)?$/i;
  const STORAGE_PREFIX = "notebook:image-viewer-state:v1:";
  const STORAGE_MAX_AGE = 30 * 60 * 1000;

  const state = {
    isOpen: false,
    isDragging: false,
    isPinching: false,
    suppressClick: false,
    dragStartX: 0,
    dragStartY: 0,
    imageStartX: 0,
    imageStartY: 0,
    pinchStartDistance: 0,
    pinchStartScale: 1,
    pinchStartX: 0,
    pinchStartY: 0,
    pinchStartCenterX: 0,
    pinchStartCenterY: 0,
    pinchImageX: 0,
    pinchImageY: 0,
    baseWidth: 1,
    baseHeight: 1,
    x: 0,
    y: 0,
    scale: 1,
    maxScale: 4,
    previousOverflow: "",
    lastFocusedElement: null,
  };

  const pointers = new Map();
  let viewer;
  let stage;
  let image;
  let restoredPageKey = "";

  function getPageKey() {
    return `${window.location.pathname}${window.location.search}`;
  }

  function getStorageKey() {
    return `${STORAGE_PREFIX}${getPageKey()}`;
  }

  function readStoredViewerState() {
    try {
      const raw = window.sessionStorage.getItem(getStorageKey());
      if (!raw) {
        return null;
      }

      const saved = JSON.parse(raw);
      if (
        typeof saved !== "object" ||
        !saved ||
        Date.now() - Number(saved.updatedAt || 0) > STORAGE_MAX_AGE
      ) {
        window.sessionStorage.removeItem(getStorageKey());
        return null;
      }

      return saved;
    } catch {
      return null;
    }
  }

  function clearStoredViewerState() {
    try {
      window.sessionStorage.removeItem(getStorageKey());
    } catch {
      // State restoration is best-effort only.
    }
  }

  function saveViewerState() {
    if (!state.isOpen || !image?.src) {
      clearStoredViewerState();
      return;
    }

    try {
      window.sessionStorage.setItem(
        getStorageKey(),
        JSON.stringify({
          isOpen: true,
          src: image.currentSrc || image.src,
          alt: image.alt || "",
          x: state.x,
          y: state.y,
          scale: state.scale,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          updatedAt: Date.now(),
        })
      );
    } catch {
      // Losing this state is acceptable; the viewer should keep working normally.
    }
  }

  function shouldEnableImage(img) {
    if (!img.currentSrc && !img.src) {
      return false;
    }

    if (img.closest(".image-viewer") || img.closest("[data-no-image-viewer]")) {
      return false;
    }

    if (img.classList.contains("twemoji") || img.classList.contains("emoji")) {
      return false;
    }

    const link = img.closest("a[href]");
    if (link && !IMAGE_HREF_PATTERN.test(link.getAttribute("href") || "")) {
      return false;
    }

    return true;
  }

  function ensureViewer() {
    const existingViewer = document.getElementById(VIEWER_ID);
    if (existingViewer) {
      viewer = existingViewer;
      stage = viewer.querySelector(".image-viewer__stage");
      image = viewer.querySelector(".image-viewer__image");
      return;
    }

    viewer = document.createElement("div");
    viewer.id = VIEWER_ID;
    viewer.className = "image-viewer";
    viewer.setAttribute("aria-hidden", "true");
    viewer.setAttribute("aria-modal", "true");
    viewer.setAttribute("role", "dialog");
    viewer.tabIndex = -1;
    viewer.innerHTML = `
      <div class="image-viewer__stage">
        <img class="image-viewer__image" alt="" draggable="false" />
      </div>
    `;

    document.body.appendChild(viewer);
    stage = viewer.querySelector(".image-viewer__stage");
    image = viewer.querySelector(".image-viewer__image");

    bindViewerEvents();
  }

  function bindViewerEvents() {
    viewer.addEventListener("click", (event) => {
      if (state.suppressClick) {
        event.preventDefault();
        event.stopPropagation();
        state.suppressClick = false;
        return;
      }

      if (event.target === viewer || event.target === stage) {
        closeViewer();
      }
    });

    viewer.addEventListener(
      "wheel",
      (event) => {
        if (!state.isOpen) {
          return;
        }

        event.preventDefault();
        const factor = event.deltaY < 0 ? 1.16 : 0.86;
        zoomAt(event.clientX, event.clientY, state.scale * factor);
      },
      { passive: false }
    );

    viewer.addEventListener("dblclick", (event) => {
      event.preventDefault();
      if (state.scale > 1.02) {
        resetToFit();
        return;
      }
      zoomAt(event.clientX, event.clientY, Math.min(2.5, state.maxScale));
    });

    stage.addEventListener("pointerdown", handlePointerDown);
    stage.addEventListener("pointermove", handlePointerMove);
    stage.addEventListener("pointerup", handlePointerEnd);
    stage.addEventListener("pointercancel", handlePointerEnd);
  }

  function bindImages() {
    ensureViewer();

    for (const img of document.querySelectorAll(IMAGE_SELECTOR)) {
      if (img.getAttribute(READY_ATTR) === "true" || !shouldEnableImage(img)) {
        continue;
      }

      img.setAttribute(READY_ATTR, "true");
      img.classList.add("image-viewer-target");
      img.tabIndex = img.tabIndex < 0 ? 0 : img.tabIndex;
      img.addEventListener("click", openFromImage);
      img.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        openFromImage(event);
      });
    }
  }

  function openFromImage(event) {
    event.preventDefault();
    event.stopPropagation();

    const sourceImage = event.currentTarget;
    const imageLink = sourceImage.closest("a[href]");
    const href = imageLink?.getAttribute("href") || "";
    const src = IMAGE_HREF_PATTERN.test(href)
      ? imageLink.href
      : sourceImage.currentSrc || sourceImage.src;
    if (!src) {
      return;
    }

    openViewer(src, sourceImage.alt || "");
  }

  function openViewer(src, alt, options = {}) {
    ensureViewer();
    state.isOpen = true;
    state.lastFocusedElement = document.activeElement;
    state.previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    pointers.clear();
    image.src = src;
    image.alt = alt;
    viewer.classList.add("is-open");
    viewer.setAttribute("aria-hidden", "false");
    viewer.focus({ preventScroll: true });

    const applyInitialLayout = () => {
      if (options.restore) {
        restoreTransform(options.restore);
        return;
      }

      resetToFit();
    };

    if (image.complete && image.naturalWidth > 0) {
      applyInitialLayout();
      return;
    }

    image.addEventListener("load", applyInitialLayout, { once: true });
    saveViewerState();
  }

  function closeViewer() {
    if (!state.isOpen) {
      return;
    }

    state.isOpen = false;
    state.isDragging = false;
    state.isPinching = false;
    pointers.clear();
    viewer.classList.remove("is-open", "is-dragging");
    viewer.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = state.previousOverflow;
    clearStoredViewerState();

    if (
      state.lastFocusedElement &&
      typeof state.lastFocusedElement.focus === "function"
    ) {
      state.lastFocusedElement.focus({ preventScroll: true });
    }
  }

  function getViewportSize() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  function resetToFit(options = {}) {
    const shouldPersist = options.persist !== false;
    const viewport = getViewportSize();
    const margin = viewport.width < 720 ? 28 : 64;
    const maxWidth = Math.max(1, viewport.width - margin);
    const maxHeight = Math.max(1, viewport.height - margin);
    const naturalWidth = image.naturalWidth || 1;
    const naturalHeight = image.naturalHeight || 1;
    const fitScale = Math.min(1, maxWidth / naturalWidth, maxHeight / naturalHeight);

    state.baseWidth = Math.max(1, naturalWidth * fitScale);
    state.baseHeight = Math.max(1, naturalHeight * fitScale);
    state.scale = 1;
    state.maxScale = Math.max(
      3,
      Math.min(8, (naturalWidth / state.baseWidth) * 2)
    );
    state.x = (viewport.width - state.baseWidth) / 2;
    state.y = (viewport.height - state.baseHeight) / 2;

    image.style.width = `${state.baseWidth}px`;
    image.style.height = `${state.baseHeight}px`;
    renderTransform();

    if (shouldPersist) {
      saveViewerState();
    }
  }

  function restoreTransform(saved) {
    resetToFit({ persist: false });

    const savedViewportWidth = Number(saved.viewportWidth) || window.innerWidth;
    const savedViewportHeight = Number(saved.viewportHeight) || window.innerHeight;
    const offsetX = (window.innerWidth - savedViewportWidth) / 2;
    const offsetY = (window.innerHeight - savedViewportHeight) / 2;
    const savedScale = Number(saved.scale);
    const savedX = Number(saved.x);
    const savedY = Number(saved.y);

    if (Number.isFinite(savedScale)) {
      state.scale = clampScale(savedScale);
    }

    if (Number.isFinite(savedX)) {
      state.x = savedX + offsetX;
    }

    if (Number.isFinite(savedY)) {
      state.y = savedY + offsetY;
    }

    clampPosition();
    renderTransform();
    saveViewerState();
  }

  function clampScale(scale) {
    return Math.min(state.maxScale, Math.max(1, scale));
  }

  function clampPosition() {
    const viewport = getViewportSize();
    const width = state.baseWidth * state.scale;
    const height = state.baseHeight * state.scale;
    const edgePadding = 80;

    if (width <= viewport.width) {
      state.x = (viewport.width - width) / 2;
    } else {
      const minX = viewport.width - width - edgePadding;
      const maxX = edgePadding;
      state.x = Math.min(maxX, Math.max(minX, state.x));
    }

    if (height <= viewport.height) {
      state.y = (viewport.height - height) / 2;
    } else {
      const minY = viewport.height - height - edgePadding;
      const maxY = edgePadding;
      state.y = Math.min(maxY, Math.max(minY, state.y));
    }
  }

  function renderTransform() {
    image.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`;
  }

  function zoomAt(clientX, clientY, requestedScale) {
    const nextScale = clampScale(requestedScale);
    const imageX = (clientX - state.x) / state.scale;
    const imageY = (clientY - state.y) / state.scale;

    state.x = clientX - imageX * nextScale;
    state.y = clientY - imageY * nextScale;
    state.scale = nextScale;

    clampPosition();
    renderTransform();
    saveViewerState();
  }

  function getPointerDistance(pointerA, pointerB) {
    const dx = pointerA.x - pointerB.x;
    const dy = pointerA.y - pointerB.y;
    return Math.hypot(dx, dy);
  }

  function getPointerCenter(pointerA, pointerB) {
    return {
      x: (pointerA.x + pointerB.x) / 2,
      y: (pointerA.y + pointerB.y) / 2,
    };
  }

  function startPinch() {
    const [pointerA, pointerB] = Array.from(pointers.values());
    const center = getPointerCenter(pointerA, pointerB);

    state.isPinching = true;
    state.pinchStartDistance = getPointerDistance(pointerA, pointerB);
    state.pinchStartScale = state.scale;
    state.pinchStartX = state.x;
    state.pinchStartY = state.y;
    state.pinchStartCenterX = center.x;
    state.pinchStartCenterY = center.y;
    state.pinchImageX = (center.x - state.x) / state.scale;
    state.pinchImageY = (center.y - state.y) / state.scale;
  }

  function handlePointerDown(event) {
    if (!state.isOpen || event.button > 0) {
      return;
    }

    event.preventDefault();
    stage.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 1) {
      state.isDragging = true;
      state.isPinching = false;
      state.dragStartX = event.clientX;
      state.dragStartY = event.clientY;
      state.imageStartX = state.x;
      state.imageStartY = state.y;
      viewer.classList.add("is-dragging");
      return;
    }

    if (pointers.size === 2) {
      state.suppressClick = true;
      startPinch();
    }
  }

  function handlePointerMove(event) {
    if (!state.isOpen || !pointers.has(event.pointerId)) {
      return;
    }

    event.preventDefault();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2 && state.isPinching) {
      const [pointerA, pointerB] = Array.from(pointers.values());
      const center = getPointerCenter(pointerA, pointerB);
      const distance = getPointerDistance(pointerA, pointerB);
      const ratio = distance / Math.max(1, state.pinchStartDistance);

      state.scale = clampScale(state.pinchStartScale * ratio);
      state.x = center.x - state.pinchImageX * state.scale;
      state.y = center.y - state.pinchImageY * state.scale;
      clampPosition();
      renderTransform();
      saveViewerState();
      return;
    }

    if (pointers.size === 1 && state.isDragging) {
      const dx = event.clientX - state.dragStartX;
      const dy = event.clientY - state.dragStartY;

      if (Math.abs(dx) + Math.abs(dy) > 4) {
        state.suppressClick = true;
      }

      state.x = state.imageStartX + dx;
      state.y = state.imageStartY + dy;
      clampPosition();
      renderTransform();
      saveViewerState();
    }
  }

  function handlePointerEnd(event) {
    if (!pointers.has(event.pointerId)) {
      return;
    }

    pointers.delete(event.pointerId);

    if (pointers.size === 1) {
      const [remainingPointer] = Array.from(pointers.values());
      state.isPinching = false;
      state.isDragging = true;
      state.dragStartX = remainingPointer.x;
      state.dragStartY = remainingPointer.y;
      state.imageStartX = state.x;
      state.imageStartY = state.y;
      return;
    }

    state.isDragging = false;
    state.isPinching = false;
    viewer.classList.remove("is-dragging");
  }

  function handleKeyDown(event) {
    if (!state.isOpen) {
      return;
    }

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    if (event.key === "Escape") {
      event.preventDefault();
      closeViewer();
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomAt(centerX, centerY, state.scale * 1.2);
    } else if (event.key === "-") {
      event.preventDefault();
      zoomAt(centerX, centerY, state.scale / 1.2);
    } else if (event.key === "0") {
      event.preventDefault();
      resetToFit();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      state.x += 42;
      clampPosition();
      renderTransform();
      saveViewerState();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      state.x -= 42;
      clampPosition();
      renderTransform();
      saveViewerState();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      state.y += 42;
      clampPosition();
      renderTransform();
      saveViewerState();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      state.y -= 42;
      clampPosition();
      renderTransform();
      saveViewerState();
    }
  }

  function handleResize() {
    if (state.isOpen) {
      resetToFit();
    }
  }

  function init() {
    if (!document.body) {
      return;
    }

    bindImages();
    restoreViewerForPage();
  }

  function restoreViewerForPage() {
    const pageKey = getPageKey();
    if (restoredPageKey === pageKey || state.isOpen) {
      return;
    }

    restoredPageKey = pageKey;
    const saved = readStoredViewerState();
    if (!saved?.isOpen || !saved.src) {
      return;
    }

    openViewer(saved.src, saved.alt || "", { restore: saved });
  }

  document.addEventListener("keydown", handleKeyDown);
  window.addEventListener("pagehide", saveViewerState);
  window.addEventListener("resize", handleResize);

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(init);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
