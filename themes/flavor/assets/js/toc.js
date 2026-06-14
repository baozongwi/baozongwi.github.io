(function() {
  var btn = document.getElementById('toc-float-btn');
  var panel = document.getElementById('toc-float-panel');
  if (!btn || !panel) return;

  btn.addEventListener('click', function() {
    var open = panel.classList.toggle('is-visible');
    btn.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', function(e) {
    if (!btn.contains(e.target) && !panel.contains(e.target)) {
      panel.classList.remove('is-visible');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  // Scrollspy
  var headings = document.querySelectorAll('.article-content h1[id], .article-content h2[id], .article-content h3[id], .article-content h4[id]');
  var tocLinks = document.querySelectorAll('.toc li, .toc-float-panel li');
  if (!headings.length || !tocLinks.length) return;

  var linkMap = {};
  tocLinks.forEach(function(li) {
    var a = li.querySelector('a');
    if (a) {
      var href = a.getAttribute('href');
      if (href && href.charAt(0) === '#') {
        linkMap[href.slice(1)] = li;
      }
    }
  });

  var activeLi = null;

  function onScroll() {
    var scrollPos = window.scrollY || document.documentElement.scrollTop;
    var current = null;

    for (var i = headings.length - 1; i >= 0; i--) {
      if (scrollPos >= headings[i].offsetTop - 80) {
        current = headings[i];
        break;
      }
    }

    var newActive = current ? linkMap[current.id] : null;
    if (newActive !== activeLi) {
      if (activeLi) activeLi.classList.remove('active-class');
      if (newActive) newActive.classList.add('active-class');
      activeLi = newActive;
    }
  }

  var ticking = false;
  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(function() {
        onScroll();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  onScroll();
})();
