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

  function tick() {
    var current = slogans[sloganIndex];

    if (!isDeleting) {
      charIndex++;
      el.textContent = current.substring(0, charIndex);

      if (charIndex === current.length) {
        setTimeout(function() {
          isDeleting = true;
          tick();
        }, 2000);
        return;
      }
      setTimeout(tick, 80);
    } else {
      charIndex--;
      el.textContent = current.substring(0, charIndex);

      if (charIndex === 0) {
        isDeleting = false;
        sloganIndex = (sloganIndex + 1) % slogans.length;
        setTimeout(tick, 500);
        return;
      }
      setTimeout(tick, 20);
    }
  }

  tick();
})();
