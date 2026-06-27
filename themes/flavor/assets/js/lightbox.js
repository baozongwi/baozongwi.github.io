(function() {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,0.85);display:none;align-items:center;justify-content:center;cursor:zoom-out;padding:20px;';
  var img = document.createElement('img');
  img.style.cssText = 'max-width:90vw;max-height:90vh;object-fit:contain;border-radius:4px;';
  overlay.appendChild(img);
  document.body.appendChild(overlay);

  function closeLightbox() {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  overlay.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeLightbox();
  });

  // `root` is document on first run, or the freshly-decrypted .article-content
  // after an encrypted post is unlocked. data-lightbox-bound guards against
  // double-binding when the same image is re-enhanced.
  function enhance(root) {
    var selector = (root.classList && root.classList.contains('article-content'))
      ? 'img:not([data-lightbox-bound])'
      : '.article-content img:not([data-lightbox-bound])';
    root.querySelectorAll(selector).forEach(function(image) {
      image.setAttribute('data-lightbox-bound', '1');
      image.addEventListener('click', function() {
        img.src = image.src;
        img.alt = image.alt || '';
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      });
    });
  }

  enhance(document);
  document.addEventListener('flavor:enhance', function(e) { enhance(e.detail); });
})();
