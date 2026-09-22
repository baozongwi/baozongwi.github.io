// Gridea / yulate: the directory stays off the right edge until the button
// opens it, and a heading click only scrolls. Close with the X or Escape.
(function() {
  var aside = document.getElementById('toc-aside');
  var btn = document.getElementById('toc-btn');
  var closeBtn = document.getElementById('toc-close');
  var read = document.querySelector('.read');
  if (!aside || !btn) return;

  function setOpen(open) {
    aside.classList.toggle('is-open', open);
    if (read) read.classList.toggle('is-toc-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    aside.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  btn.addEventListener('click', function() {
    setOpen(!aside.classList.contains('is-open'));
  });
  if (closeBtn) closeBtn.addEventListener('click', function() { setOpen(false); });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') setOpen(false);
  });
})();

// The current section stays highlighted from its heading until the next one
// reaches the line under the navbar. Rebuilt after decrypt via flavor:enhance.
(function() {
  var currentActive = null;
  var headings = [];
  var linkMap = {};
  var onScroll = null;

  function detach() {
    if (onScroll) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      onScroll = null;
    }
    if (currentActive && linkMap[currentActive]) {
      linkMap[currentActive].forEach(function(el) { el.classList.remove('active-class'); });
    }
    currentActive = null;
    headings = [];
    linkMap = {};
  }

  function init() {
    detach();
    headings = Array.prototype.slice.call(document.querySelectorAll('.article-content h1[id], .article-content h2[id], .article-content h3[id], .article-content h4[id]'));
    if (!headings.length) return;

    document.querySelectorAll('.toc li').forEach(function(li) {
      var a = li.querySelector('a');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) !== '#') return;
      var id = href.slice(1);
      if (!linkMap[id]) linkMap[id] = [];
      linkMap[id].push(li);
    });

    var rafPending = false;
    function scheduleUpdate() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(function() {
        rafPending = false;
        applyActive();
      });
    }

    function sectionId() {
      var line = window.scrollY + 96;
      var active = null;
      for (var i = 0; i < headings.length; i++) {
        var top = headings[i].getBoundingClientRect().top + window.scrollY;
        if (top <= line) active = headings[i];
        else break;
      }
      return active ? active.id : null;
    }

    function reveal(id) {
      var list = document.querySelector('.read__toc .toc');
      var items = linkMap[id];
      if (!list || !items) return;
      var activeLi = null;
      for (var k = 0; k < items.length; k++) {
        if (list.contains(items[k])) { activeLi = items[k]; break; }
      }
      if (!activeLi) return;
      var cr = list.getBoundingClientRect();
      var ir = activeLi.getBoundingClientRect();
      if (ir.top < cr.top || ir.bottom > cr.bottom) {
        list.scrollTop += ir.top - cr.top - 12;
      }
    }

    function applyActive() {
      var newId = sectionId();
      if (newId === currentActive) return;
      if (currentActive && linkMap[currentActive]) {
        linkMap[currentActive].forEach(function(el) { el.classList.remove('active-class'); });
      }
      if (newId && linkMap[newId]) {
        linkMap[newId].forEach(function(el) { el.classList.add('active-class'); });
        reveal(newId);
      }
      currentActive = newId;
    }

    onScroll = scheduleUpdate;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    applyActive();
  }

  init();
  document.addEventListener('flavor:enhance', init);
})();
