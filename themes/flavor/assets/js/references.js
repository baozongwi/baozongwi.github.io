(function() {
  // `root` is document on first run, or the freshly-decrypted .article-content
  // after an encrypted post is unlocked.
  function getArticles(root) {
    if (root.classList && root.classList.contains('article-content')) return [root];
    return root.querySelectorAll('.article-content');
  }

  function enhance(root) {
    getArticles(root).forEach(function(article) {
      // Manual override — skip when the article contains <!-- no-references -->
      if (/<!--\s*no-references\s*-->/.test(article.innerHTML)) return;

      // Core condition: only the LAST <blockquote> in the article is a candidate.
      // Reference link blocks always sit at the end of the post.
      var blockquotes = article.querySelectorAll('blockquote');
      if (blockquotes.length === 0) return;
      var bq = blockquotes[blockquotes.length - 1];

      // Already processed
      if (bq.classList.contains('ref-links')) return;

      // Lightweight validation: at least one http(s) link must be present.
      // Guards against pure-text closing blockquotes being misidentified.
      var anchors = bq.querySelectorAll('a[href^="http://"], a[href^="https://"]');
      if (anchors.length === 0) return;

      // --- Render numbered reference list ---
      bq.innerHTML = '';
      bq.classList.add('ref-links');
      for (var i = 0; i < anchors.length; i++) {
        var div = document.createElement('div');
        div.className = 'ref-links__item';
        var a = document.createElement('a');
        a.href = anchors[i].href;
        a.textContent = anchors[i].textContent.trim();
        a.target = '_blank';
        a.rel = 'noopener';
        div.appendChild(a);
        bq.appendChild(div);
      }
    });
  }

  // Defer to browser idle so the entrance animations on the article body
  // don't get interrupted by the innerHTML rewrite. Falls back to setTimeout
  // on Safari where requestIdleCallback is not available.
  var schedule = window.requestIdleCallback
    ? function(fn) { window.requestIdleCallback(fn, { timeout: 500 }); }
    : function(fn) { setTimeout(fn, 200); };

  schedule(function() { enhance(document); });
  document.addEventListener('flavor:enhance', function(e) {
    schedule(function() { enhance(e.detail); });
  });
})();
