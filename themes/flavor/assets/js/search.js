(function() {
  var overlay = document.getElementById('search-overlay');
  var input = document.getElementById('search-input');
  var results = document.getElementById('search-results');
  var searchBtn = document.getElementById('search-btn');
  if (!overlay || !input || !results || !searchBtn) return;

  // Pagefind is generated post-build (npx pagefind --site public), so the
  // module only exists on the deployed site. Loaded lazily on first open.
  var pagefind = null;
  var loader = null;
  // Resolved from the overlay's data attribute so that sites deployed under a
  // subpath (baseURL ending in a directory) still find the index.
  function pagefindUrl() {
    return overlay.getAttribute('data-pagefind') || '/pagefind/pagefind.js';
  }
  function loadPagefind() {
    if (pagefind) return Promise.resolve(pagefind);
    if (loader) return loader;
    loader = import(pagefindUrl())
      .then(function(mod) {
        pagefind = mod;
        pagefind.init();
        return pagefind;
      })
      .catch(function(err) {
        loader = null;
        results.innerHTML = '<div class="search-overlay__empty">Search index unavailable (build it first for local preview)</div>';
        throw err;
      });
    return loader;
  }

  function open() {
    overlay.classList.add('is-visible');
    input.focus();
    loadPagefind();
  }

  function close() {
    overlay.classList.remove('is-visible');
    input.value = '';
    results.innerHTML = '<div class="search-overlay__empty">Type to start searching</div>';
  }

  searchBtn.addEventListener('click', open);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('is-visible')) {
      close();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (overlay.classList.contains('is-visible')) close();
      else open();
    }
  });

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + String(d.getDate()).padStart(2, '0') + ', ' + d.getFullYear();
  }

  function render(hits) {
    if (!hits.length) {
      results.innerHTML = '<div class="search-overlay__empty">No matching posts</div>';
      return;
    }
    results.innerHTML = hits.map(function(item) {
      // item.excerpt is Pagefind-generated HTML with <mark> highlights.
      return '<a class="search-hit" href="' + item.url + '">' +
        '<div class="search-hit__title">' + esc(item.meta.title || item.url) + '</div>' +
        '<div class="search-hit__meta">' + esc(formatDate(item.meta.date)) + '</div>' +
        '<div class="search-hit__excerpt">' + item.excerpt + '</div>' +
        '</a>';
    }).join('');
  }

  var searchSeq = 0;
  input.addEventListener('input', function() {
    var query = input.value.trim();
    if (!query) {
      results.innerHTML = '<div class="search-overlay__empty">Type to start searching</div>';
      return;
    }
    var seq = ++searchSeq;
    loadPagefind().then(function(pf) {
      // debouncedSearch coalesces fast typing; returns null for stale calls.
      return pf.debouncedSearch(query, {}, 250);
    }).then(function(search) {
      if (!search || seq !== searchSeq) return;
      return Promise.all(search.results.slice(0, 10).map(function(r) { return r.data(); }))
        .then(function(hits) {
          if (seq !== searchSeq) return;
          render(hits);
        });
    }).catch(function() {});
  });
})();
