/* Preserve bookmarked queries and fragments when following a legacy route. */
(() => {
  "use strict";

  const link = document.querySelector("[data-redirect-target]");
  if (!link) return;

  const target = new URL(link.href, window.location.href);
  if (window.location.search) target.search = window.location.search;
  if (window.location.hash) target.hash = window.location.hash;
  link.href = target.href;
  window.location.replace(target.href);
})();
