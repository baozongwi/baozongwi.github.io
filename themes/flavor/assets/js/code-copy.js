(function() {
  var COPY_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  var CHECK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  // Bind copy buttons onto every code block under `root`. Idempotent — blocks
  // that already have a button are skipped, so it's safe to call again after
  // encrypted content is decrypted and injected.
  function enhance(root) {
    root.querySelectorAll('.highlight').forEach(function(block) {
      if (block.querySelector('.highlight__copy')) return;
      var pre = block.querySelector('pre');
      if (!pre) return;

      var btn = document.createElement('button');
      btn.className = 'highlight__copy';
      btn.setAttribute('aria-label', 'Copy code');
      btn.innerHTML = COPY_ICON;

      btn.addEventListener('click', function() {
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

      block.appendChild(btn);
    });
  }

  enhance(document);
  document.addEventListener('flavor:enhance', function(e) { enhance(e.detail); });
})();
