(function() {
  // --- Intersection Observer scrollspy ---
  var headings = document.querySelectorAll('.article-content h1[id], .article-content h2[id], .article-content h3[id], .article-content h4[id]');
  if (!headings.length) return;

  // Build link map: heading id -> array of <li> elements (sidebar + mobile TOC)
  var linkMap = {};
  var tocLinks = document.querySelectorAll('.toc li');
  tocLinks.forEach(function(li) {
    var a = li.querySelector('a');
    if (a) {
      var href = a.getAttribute('href');
      if (href && href.charAt(0) === '#') {
        var id = href.slice(1);
        if (!linkMap[id]) linkMap[id] = [];
        linkMap[id].push(li);
      }
    }
  });

  var currentActive = null;
  var headingVisible = new Map();
  headings.forEach(function(h) { headingVisible.set(h, false); });

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      headingVisible.set(entry.target, entry.isIntersecting);
    });

    // Find the first visible heading (nearest to top of viewport)
    var activeHeading = null;
    for (var i = 0; i < headings.length; i++) {
      if (headingVisible.get(headings[i])) {
        activeHeading = headings[i];
        break;
      }
    }

    var newId = activeHeading ? activeHeading.id : null;
    if (newId !== currentActive) {
      // Remove highlight from previous
      if (currentActive && linkMap[currentActive]) {
        linkMap[currentActive].forEach(function(el) { el.classList.remove('active-class'); });
      }
      // Add highlight to new
      if (newId && linkMap[newId]) {
        linkMap[newId].forEach(function(el) { el.classList.add('active-class'); });

        // Auto-scroll sidebar TOC container so active item stays visible
        var sidebar = document.querySelector('.post-layout__aside');
        if (sidebar) {
          var activeLi = null;
          for (var k = 0; k < linkMap[newId].length; k++) {
            if (sidebar.contains(linkMap[newId][k])) {
              activeLi = linkMap[newId][k];
              break;
            }
          }
          if (activeLi) {
            var cr = sidebar.getBoundingClientRect();
            var ir = activeLi.getBoundingClientRect();
            if (ir.top < cr.top || ir.bottom > cr.bottom) {
              activeLi.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }
        }
      }
      currentActive = newId;
    }
  }, {
    rootMargin: '-20px 0px -70% 0px',
    threshold: 0
  });

  headings.forEach(function(h) { observer.observe(h); });
})();
