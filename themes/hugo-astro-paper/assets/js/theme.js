/* Theme toggle — port of src/scripts/theme.ts (no view transitions in Hugo) */
(function () {
  var THEME_KEY = "theme";
  var LIGHT = "light";
  var DARK = "dark";

  function getPreferredTheme() {
    var stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? DARK
      : LIGHT;
  }

  // Reuse the value already set by the inline FOUC-prevention script if present.
  var themeValue =
    window.__theme && window.__theme.value
      ? window.__theme.value
      : getPreferredTheme();

  function persist() {
    localStorage.setItem(THEME_KEY, themeValue);
    reflect();
  }

  function reflect() {
    var root = document.firstElementChild;
    if (root) {
      root.setAttribute("data-theme", themeValue);
      root.classList.toggle("dark", themeValue === DARK);
    }
    document
      .querySelector("#theme-btn")
      ?.setAttribute("aria-label", themeValue);

    // Fill <meta name="theme-color"> with the computed background colour so
    // Android's browser chrome matches the page background.
    var bg = window.getComputedStyle(document.body).backgroundColor;
    document
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", bg);
  }

  function setup() {
    reflect();
    document.querySelector("#theme-btn")?.addEventListener("click", function () {
      themeValue = themeValue === LIGHT ? DARK : LIGHT;
      persist();
    });
  }

  setup();

  // Sync with OS-level dark/light preference changes.
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", function (e) {
      themeValue = e.matches ? DARK : LIGHT;
      persist();
    });
})();
