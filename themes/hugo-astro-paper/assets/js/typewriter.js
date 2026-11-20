/* Typewriter slogans in the hero — ported from the flavor theme.
   Slogans come from window.astroPaperSlogans (injected in baseof.html from
   params.typewriter.slogans). Pauses when the tab is hidden or the hero
   scrolls out of view. */
(function () {
  var el = document.getElementById("typewriter-text");
  if (!el) return;

  var slogans = window.astroPaperSlogans || ["Stay hungry, stay foolish"];

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

    var current = slogans[sloganIndex % slogans.length];

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

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { clearTimeout(timer); running = false; }
    else resume();
  });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (!inView) { clearTimeout(timer); running = false; }
      else resume();
    }, { threshold: 0 });
    io.observe(el);
  }

  tick();
})();
