// Reading progress bar. Measures the article body on every frame instead of
// caching its height: lazy-loaded images change the height while you scroll,
// and a cached span left the bar stuck below 100% at the end of long posts.
(function() {
  var bar = document.getElementById('read-progress');
  var fill = bar && bar.querySelector('.read-progress__fill');
  if (!fill) return;

  var article = null;
  var raf = false;

  function navHeight() {
    var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'));
    return isNaN(v) ? 70 : v;
  }

  function findArticle() {
    article = document.querySelector('.article-content') || document.querySelector('.post-single');
    return article;
  }

  function update() {
    raf = false;
    if (!article) return;
    var nav = navHeight();
    var rect = article.getBoundingClientRect();
    var total = rect.height - window.innerHeight + nav;
    var p = total > 0 ? (nav - rect.top) / total : (rect.top < window.innerHeight ? 1 : 0);
    if (p < 0) p = 0;
    else if (p > 1) p = 1;
    fill.style.width = (p * 100).toFixed(2) + '%';
    bar.classList.toggle('is-active', p > 0);
  }

  function onScroll() {
    if (raf) return;
    raf = true;
    requestAnimationFrame(update);
  }

  findArticle();
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', update);
  // Lazy images grow the article after the first paint, which changes the
  // ratio without any scroll event. Re-run when the body's height changes.
  if (window.ResizeObserver && article) {
    new ResizeObserver(update).observe(article);
  }
  // Encrypted posts only get their .article-content after decryption.
  document.addEventListener('flavor:enhance', function() {
    findArticle();
    update();
  });
})();
