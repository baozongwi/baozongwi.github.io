(function() {
  var el = document.getElementById('typewriter-text');
  if (!el) return;

  var slogans = window.flavorSlogans || [
    "天地不仁，以万物为刍狗",
    "flag{ctfer_code_audit_ad_attack_cloud_sec}"
  ];

  var sloganIndex = 0;
  var charIndex = 0;
  var isDeleting = false;
  var timer = null;
  var inView = true;
  var running = false;

  function schedule(delay) {
    clearTimeout(timer);
    timer = setTimeout(tick, delay);
  }

  function tick() {
    // Bail out silently while hidden — resume() restarts the loop.
    if (document.hidden || !inView) { running = false; return; }
    running = true;

    var current = slogans[sloganIndex];

    if (!isDeleting) {
      charIndex++;
      el.textContent = current.substring(0, charIndex);

      if (charIndex === current.length) {
        schedule(2000);
        isDeleting = true;
        return;
      }
      schedule(80);
    } else {
      charIndex--;
      el.textContent = current.substring(0, charIndex);

      if (charIndex === 0) {
        isDeleting = false;
        sloganIndex = (sloganIndex + 1) % slogans.length;
        schedule(500);
        return;
      }
      schedule(20);
    }
  }

  function resume() {
    if (running || document.hidden || !inView) return;
    schedule(0);
  }

  document.addEventListener('visibilitychange', function() {
    if (document.hidden) { clearTimeout(timer); running = false; }
    else resume();
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries) {
      inView = entries[0].isIntersecting;
      if (!inView) { clearTimeout(timer); running = false; }
      else resume();
    }, { threshold: 0 });
    io.observe(el);
  }

  tick();
})();
