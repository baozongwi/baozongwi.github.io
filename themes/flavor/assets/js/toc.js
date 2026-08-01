// ============================================================
// Mobile floating TOC: FAB visibility + bottom-sheet drawer.
// The FAB / drawer / overlay live in a <template id="toc-mobile-tpl">
// on post pages that have a TOC. We only clone them into <body> when
// the viewport matches (max-width: 768px), so desktop pages don't
// carry the extra DOM.
//
// This IIFE runs BEFORE the scrollspy IIFE below so that the drawer's
// <li> elements exist in the live DOM by the time scrollspy builds its
// linkMap — otherwise the mobile drawer would never highlight.
// ============================================================
(function() {
  var tpl = document.getElementById('toc-mobile-tpl');
  if (!tpl || !('content' in tpl)) return;

  var mq = window.matchMedia('(max-width: 768px)');
  var mounted = false;

  function mount() {
    if (mounted) return;
    document.body.appendChild(tpl.content.cloneNode(true));
    var fab = document.getElementById('toc-fab');
    var drawer = document.getElementById('toc-drawer');
    if (!fab || !drawer) return;
    mounted = true;

    var overlay = document.getElementById('toc-drawer-overlay');
    var closeBtn = document.getElementById('toc-drawer-close');

    function openDrawer() {
      drawer.classList.add('is-open');
      if (overlay) overlay.classList.add('is-visible');
      document.body.classList.add('toc-drawer-open');

      // Bring the active section into view inside the sheet. transform is a
      // visual-only change (no layout), so one rAF is enough to land the scroll.
      var active = drawer.querySelector('li.active-class');
      if (active) {
        requestAnimationFrame(function() {
          active.scrollIntoView({ block: 'center' });
        });
      }
    }

    function closeDrawer() {
      drawer.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-visible');
      document.body.classList.remove('toc-drawer-open');
    }

    fab.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);

    // Close after picking a section. The listener fires during bubble, before
    // the browser performs the default hash jump, so body overflow is restored
    // first and the anchor scroll lands correctly.
    drawer.addEventListener('click', function(e) {
      if (e.target.closest('a')) closeDrawer();
    });

    // ESC to close
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });

    // Show the FAB only after the article header scrolls out of view, so it
    // doesn't duplicate the top TOC while the reader is still at the top.
    var header = document.querySelector('.post-single__header');
    if (header) {
      var headerIO = new IntersectionObserver(function(entries) {
        var entry = entries[0];
        fab.classList.toggle('is-visible', entry.boundingClientRect.bottom < 0);
      }, { threshold: 0 });
      headerIO.observe(header);
    } else {
      fab.classList.add('is-visible');
    }
  }

  if (mq.matches) mount();
  // Also handle devtools resize / orientation change into mobile.
  if (mq.addEventListener) mq.addEventListener('change', function(e) { if (e.matches) mount(); });
  else mq.addListener(function(e) { if (e.matches) mount(); });
})();

// ============================================================
// Intersection Observer scrollspy for sidebar + mobile drawer TOC.
// 支持 reinit：加密文章解密后 headings 重新出现时，由 flavor:enhance 事件
// 触发重新初始化（重新扫描 headings、重建 linkMap、新建 observer）。
// ============================================================
(function() {
  var observer = null;
  var currentActive = null;

  function init() {
    if (observer) { observer.disconnect(); observer = null; }
    currentActive = null;

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

    var headingVisible = new Map();
    headings.forEach(function(h) { headingVisible.set(h, false); });

    // Coalesce multiple IntersectionObserver callbacks per frame into one
    // DOM update — fast scrolling won't fight the main scroll for frames.
    var rafPending = false;
    function scheduleUpdate() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(function() {
        rafPending = false;
        applyActive();
      });
    }

    function applyActive() {
      var activeHeading = null;
      for (var i = 0; i < headings.length; i++) {
        if (headingVisible.get(headings[i])) {
          activeHeading = headings[i];
          break;
        }
      }

      var newId = activeHeading ? activeHeading.id : null;
      if (newId === currentActive) return;

      if (currentActive && linkMap[currentActive]) {
        linkMap[currentActive].forEach(function(el) { el.classList.remove('active-class'); });
      }
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

    observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        headingVisible.set(entry.target, entry.isIntersecting);
      });
      scheduleUpdate();
    }, {
      rootMargin: '-20px 0px -70% 0px',
      threshold: 0
    });

    headings.forEach(function(h) { observer.observe(h); });
  }

  init();
  document.addEventListener('flavor:enhance', init);
})();
