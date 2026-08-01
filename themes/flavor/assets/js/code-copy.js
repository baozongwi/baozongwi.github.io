(function() {
  var COPY_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  var CHECK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  // Insert a single button into each code block. No per-button listener —
  // one document-level click delegate handles them all (below).
  function enhance(root) {
    root.querySelectorAll('.highlight').forEach(function(block) {
      if (block.querySelector('.highlight__copy')) return;
      if (!block.querySelector('pre')) return;
      block.appendChild(createButton());
    });

    root.querySelectorAll('.article-content pre:not(.chroma)').forEach(function(pre) {
      if (pre.querySelector('.highlight__copy')) return;
      if (pre.closest('.highlight')) return;
      pre.appendChild(createButton());
    });
  }

  function createButton() {
    var btn = document.createElement('button');
    btn.className = 'highlight__copy';
    btn.setAttribute('aria-label', 'Copy code');
    btn.innerHTML = COPY_ICON;
    return btn;
  }

  // Single delegated click handler — copies text from the enclosing <pre>.
  document.addEventListener('click', function(e) {
    var btn = e.target.closest && e.target.closest('.highlight__copy');
    if (!btn) return;
    var pre = btn.parentElement && btn.parentElement.tagName === 'PRE'
      ? btn.parentElement
      : btn.parentElement && btn.parentElement.querySelector('pre');
    if (!pre) return;
    var text = pre.textContent || pre.innerText;
    navigator.clipboard.writeText(text).then(function() {
      btn.classList.add('copied');
      btn.innerHTML = CHECK_ICON;
      setTimeout(function() {
        btn.classList.remove('copied');
        btn.innerHTML = COPY_ICON;
      }, 2000);
    });
  });

  enhance(document);
  document.addEventListener('flavor:enhance', function(e) { enhance(e.detail); });
})();
