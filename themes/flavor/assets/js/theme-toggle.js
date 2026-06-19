(function() {
  var toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  // 清理旧版 localStorage 残留
  localStorage.removeItem('flavor-theme');

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
})();
