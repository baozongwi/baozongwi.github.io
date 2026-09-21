(function() {
  var toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  var OVERRIDE_KEY = 'flavor-theme-override';
  var mq = window.matchMedia('(prefers-color-scheme: dark)');

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    updateIcon(theme);
  }

  function updateIcon(theme) {
    var sun = toggle.querySelector('.icon-sun');
    var moon = toggle.querySelector('.icon-moon');
    if (sun) sun.style.display = theme === 'dark' ? 'none' : 'block';
    if (moon) moon.style.display = theme === 'dark' ? 'block' : 'none';
  }

  // 手动切换：写入 sessionStorage，本次会话不再跟随系统
  toggle.addEventListener('click', function() {
    var next = getTheme() === 'dark' ? 'light' : 'dark';
    sessionStorage.setItem(OVERRIDE_KEY, next);
    setTheme(next);
  });

  // 系统主题变化：仅在本次会话无手动选择时才跟随
  mq.addEventListener('change', function(e) {
    if (!sessionStorage.getItem(OVERRIDE_KEY)) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });

  updateIcon(getTheme());

  // Hamburger menu
  var hamburger = document.getElementById('hamburger');
  var navLinks = document.getElementById('nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function() {
      navLinks.classList.toggle('is-open');
    });
  }

  // Links hub: hover on fine-pointer desktop, tap on phone/tablet
  var hubs = document.querySelectorAll('.navbar__hub');
  var mqHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  var mqPhone = window.matchMedia('(max-width: 768px)');
  function useHoverHub() {
    return mqHover.matches && !mqPhone.matches;
  }
  function setHubOpen(hub, open) {
    var btn = hub.querySelector('.navbar__hub-toggle');
    hub.classList.toggle('is-open', open);
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function closeHubs() {
    hubs.forEach(function(hub) { setHubOpen(hub, false); });
  }
  hubs.forEach(function(hub) {
    var btn = hub.querySelector('.navbar__hub-toggle');
    if (!btn) return;
    hub.addEventListener('mouseenter', function() {
      if (useHoverHub()) setHubOpen(hub, true);
    });
    hub.addEventListener('mouseleave', function() {
      if (useHoverHub()) setHubOpen(hub, false);
    });
    btn.addEventListener('click', function(e) {
      if (useHoverHub()) return;
      e.preventDefault();
      e.stopPropagation();
      var willOpen = !hub.classList.contains('is-open');
      closeHubs();
      setHubOpen(hub, willOpen);
    });
  });
  if (hubs.length) {
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.navbar__hub')) closeHubs();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeHubs();
    });
    function onModeChange() { closeHubs(); }
    if (mqHover.addEventListener) {
      mqHover.addEventListener('change', onModeChange);
      mqPhone.addEventListener('change', onModeChange);
    }
  }
})();
