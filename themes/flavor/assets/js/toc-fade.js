// Long tables of contents only.
//
// The median post has six headings, so most lists are shown whole. Above
// LONG_THRESHOLD entries the list is capped (see .is-long in _toc.scss) and
// this adds a bottom fade while it actually overflows — the scrollbar itself
// stays hidden so the list never turns back into a framed panel.
(function() {
  var LONG_THRESHOLD = 25;

  var block = document.querySelector('.post-toc');
  var body = block && block.querySelector('.post-toc__body');
  if (!body) return;

  function update() {
    var items = body.querySelectorAll('li').length;
    var long = items > LONG_THRESHOLD;
    block.classList.toggle('is-long', long);
    if (!long) {
      body.classList.remove('is-clipped');
      return;
    }
    body.classList.toggle('is-clipped', body.scrollHeight > body.clientHeight + 2);
  }

  update();
  window.addEventListener('resize', update);
  // encrypt.js fills the list after the password is accepted.
  document.addEventListener('flavor:enhance', update);
})();
