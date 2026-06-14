(function() {
  var overlay = document.getElementById('search-overlay');
  var input = document.getElementById('search-input');
  var results = document.getElementById('search-results');
  var searchBtn = document.getElementById('search-btn');
  if (!overlay || !input || !results || !searchBtn) return;

  var index = null;
  var fuse = null;

  function loadIndex() {
    if (index) return Promise.resolve();
    return fetch('/index.json')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        index = data;
        fuse = new Fuse(data, {
          keys: [
            { name: 'title', weight: 0.4 },
            { name: 'tags', weight: 0.2 },
            { name: 'categories', weight: 0.2 },
            { name: 'content', weight: 0.2 }
          ],
          includeMatches: true,
          threshold: 0.3,
          ignoreLocation: true
        });
      });
  }

  function open() {
    overlay.classList.add('is-visible');
    input.focus();
    loadIndex();
  }

  function close() {
    overlay.classList.remove('is-visible');
    input.value = '';
    results.innerHTML = '<div class="search-overlay__empty">输入关键词开始搜索</div>';
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

  input.addEventListener('input', function() {
    var query = input.value.trim();
    if (!query || !fuse) {
      results.innerHTML = '<div class="search-overlay__empty">输入关键词开始搜索</div>';
      return;
    }

    var hits = fuse.search(query, { limit: 10 });
    if (!hits.length) {
      results.innerHTML = '<div class="search-overlay__empty">没有找到相关文章</div>';
      return;
    }

    results.innerHTML = hits.map(function(hit) {
      var item = hit.item;
      var excerpt = '';
      if (item.content) {
        var idx = item.content.toLowerCase().indexOf(query.toLowerCase());
        if (idx > -1) {
          var start = Math.max(0, idx - 30);
          var end = Math.min(item.content.length, idx + query.length + 60);
          excerpt = (start > 0 ? '...' : '') + item.content.slice(start, end) + (end < item.content.length ? '...' : '');
          excerpt = excerpt.replace(new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
        } else {
          excerpt = item.content.slice(0, 80) + '...';
        }
      }
      return '<a class="search-hit" href="' + item.permalink + '">' +
        '<div class="search-hit__title">' + item.title + '</div>' +
        '<div class="search-hit__meta">' + (item.date || '') + '</div>' +
        (excerpt ? '<div class="search-hit__excerpt">' + excerpt + '</div>' : '') +
        '</a>';
    }).join('');
  });
})();
