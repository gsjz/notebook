(() => {
  'use strict';
  const target = document.querySelector('.demo') || document.body;
  let queued = false;
  const resize = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      try {
        if (window.frameElement) window.frameElement.style.height = `${Math.ceil(target.getBoundingClientRect().height) + 2}px`;
      } catch (_) { /* Standalone and cross-origin embeds keep their configured height. */ }
    });
  };
  new ResizeObserver(resize).observe(target);
  document.fonts.ready.then(resize);
  window.addEventListener('load', resize);
  resize();
})();
