(function() {
  var screen = document.getElementById('welcome-screen');
  if (!screen) return;

  var KEY = 'flavor-welcome-shown';
  if (sessionStorage.getItem(KEY)) {
    screen.remove();
    return;
  }

  document.body.classList.add('welcome-visible');

  setTimeout(function() {
    screen.classList.add('is-hidden');
    document.body.classList.remove('welcome-visible');
    sessionStorage.setItem(KEY, '1');
    setTimeout(function() { screen.remove(); }, 700);
  }, 1800);
})();
