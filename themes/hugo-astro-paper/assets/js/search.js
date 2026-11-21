/* Search overlay — ported from the flavor theme.
   Pagefind is generated post-build (pagefind -site public); the API module
   is imported lazily on first open. */
(function () {
  var overlay = document.getElementById("search-overlay");
  var input = document.getElementById("search-input");
  var results = document.getElementById("search-results");
  var searchBtn = document.getElementById("search-btn");
  if (!overlay || !input || !results || !searchBtn) return;

  var pagefind = null;
  var loader = null;

  // Resolved from the overlay's data attribute so that sites deployed under a
  // subpath (baseURL ending in a directory) still find the index.
  function pagefindUrl() {
    return overlay.getAttribute("data-pagefind") || "/pagefind/pagefind.js";
  }

  function loadPagefind() {
    if (pagefind) return Promise.resolve(pagefind);
    if (loader) return loader;
    loader = import(pagefindUrl())
      .then(function (mod) {
        pagefind = mod;
        pagefind.init();
        return pagefind;
      })
      .catch(function (err) {
        loader = null;
        results.innerHTML =
          '<div class="search-overlay__empty">Search index unavailable (build it first for local preview)</div>';
        throw err;
      });
    return loader;
  }

  var lastFocus = null;

  // Everything inside the dialog that can take focus (results load async).
  function focusables() {
    var nodes = overlay.querySelectorAll(
      'input, button, a[href], [tabindex]:not([tabindex="-1"])'
    );
    return Array.prototype.filter.call(nodes, function (el) {
      return !el.disabled && el.getClientRects().length > 0;
    });
  }

  function open() {
    lastFocus = document.activeElement;
    overlay.classList.add("is-visible");
    overlay.removeAttribute("aria-hidden");
    // Reading a layout property flushes style, so the dialog is already
    // visibility:visible when we move focus into it.
    void overlay.offsetWidth;
    input.focus();
    loadPagefind();
  }

  function close() {
    // Hand focus back before hiding the dialog: aria-hidden on a container
    // that still owns focus is exactly what browsers complain about.
    var target = lastFocus || searchBtn;
    if (target && typeof target.focus === "function") target.focus();
    overlay.classList.remove("is-visible");
    overlay.setAttribute("aria-hidden", "true");
    input.value = "";
    results.innerHTML =
      '<div class="search-overlay__empty">Type to start searching</div>';
    lastFocus = null;
  }

  searchBtn.addEventListener("click", open);

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) close();
  });

  document.addEventListener("keydown", function (e) {
    var isOpen = overlay.classList.contains("is-visible");

    if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      close();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      if (isOpen) close();
      else open();
      return;
    }

    // Keep Tab inside the dialog while it is open.
    if (e.key === "Tab" && isOpen) {
      var list = focusables();
      if (!list.length) {
        e.preventDefault();
        return;
      }
      var first = list[0];
      var last = list[list.length - 1];
      var active = document.activeElement;
      if (e.shiftKey && (active === first || !overlay.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !overlay.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    var months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return (
      months[d.getMonth()] +
      " " +
      String(d.getDate()).padStart(2, "0") +
      ", " +
      d.getFullYear()
    );
  }

  function render(hits) {
    if (!hits.length) {
      results.innerHTML =
        '<div class="search-overlay__empty">No matching posts</div>';
      return;
    }
    results.innerHTML = hits
      .map(function (item) {
        // item.excerpt is Pagefind-generated HTML with <mark> highlights.
        return (
          '<a class="search-hit" href="' + item.url + '">' +
          '<div class="search-hit__title">' + esc(item.meta.title || item.url) + "</div>" +
          '<div class="search-hit__meta">' + esc(formatDate(item.meta.date)) + "</div>" +
          '<div class="search-hit__excerpt">' + item.excerpt + "</div>" +
          "</a>"
        );
      })
      .join("");
  }

  var searchSeq = 0;

  input.addEventListener("input", function () {
    var query = input.value.trim();
    if (!query) {
      results.innerHTML =
        '<div class="search-overlay__empty">Type to start searching</div>';
      return;
    }
    var seq = ++searchSeq;
    loadPagefind()
      .then(function (pf) {
        // debouncedSearch coalesces fast typing; returns null for stale calls.
        return pf.debouncedSearch(query, {}, 250);
      })
      .then(function (search) {
        if (!search || seq !== searchSeq) return;
        return Promise.all(
          search.results.slice(0, 10).map(function (r) {
            return r.data();
          })
        ).then(function (hits) {
          if (seq !== searchSeq) return;
          render(hits);
        });
      })
      .catch(function () {});
  });
})();
