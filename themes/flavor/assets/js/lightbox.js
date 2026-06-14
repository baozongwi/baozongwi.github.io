(function() {
  var images = document.querySelectorAll('.article-content img');
  if (!images.length) return;

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

  images.forEach(function(image) {
    image.addEventListener('click', function() {
      img.src = image.src;
      img.alt = image.alt || '';
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    });
  });
})();
