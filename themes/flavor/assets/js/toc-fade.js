// Long tables of contents are capped in height by CSS, which leaves the last
// row sliced off. Hide the scrollbar (it made the list look like a panel) and
// fade the bottom edge instead — but only when the list actually overflows, so
// a short TOC keeps a clean last line.
(function() {
  var block = document.querySelector('.post-toc');
  var body = block && block.querySelector('.post-toc__body');
  if (!body) return;

  function update() {
    body.classList.toggle('is-clipped', body.scrollHeight > body.clientHeight + 2);
  }

  update();
  window.addEventListener('resize', update);
  // encrypt.js fills the list after the password is accepted.
  document.addEventListener('flavor:enhance', function() {
    update();
  });
})();
