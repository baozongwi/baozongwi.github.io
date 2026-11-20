/* App-level behaviour — port of Header.astro / Main.astro / BackButton.astro scripts */
(function () {
  /* ---- mobile menu toggle (Header.astro) ---- */
  function toggleNav() {
    var menuBtn = document.querySelector("#menu-btn");
    var menuItems = document.querySelector("#menu-items");
    var menuIcon = document.querySelector("#menu-icon");
    var closeIcon = document.querySelector("#close-icon");

    if (!menuBtn || !menuItems || !menuIcon || !closeIcon) return;

    var openLabel = menuBtn.dataset.labelOpen || "Open menu";
    var closeLabel = menuBtn.dataset.labelClose || "Close menu";

    menuBtn.addEventListener("click", function () {
      var openMenu = menuBtn.getAttribute("aria-expanded") === "true";

      menuBtn.setAttribute("aria-expanded", openMenu ? "false" : "true");
      menuBtn.setAttribute("aria-label", openMenu ? openLabel : closeLabel);

      menuItems.classList.toggle("hidden");
      menuIcon.classList.toggle("hidden");
      closeIcon.classList.toggle("hidden");
    });
  }

  /* ---- skip to content (Header.astro) ---- */
  function handleSkipToContent() {
    var skipLink = document.getElementById("skip-to-content");
    if (!skipLink) return;
    skipLink.addEventListener("click", function (e) {
      if (
        e.defaultPrevented ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.button !== 0
      )
        return;
      e.preventDefault();
      var target = document.getElementById("main-content");
      if (target) {
        target.setAttribute("tabindex", "-1");
        target.addEventListener(
          "blur",
          function () {
            target.removeAttribute("tabindex");
          },
          { once: true }
        );
        target.focus();
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  /* ---- remember where to go back to (Main.astro / index.astro) ---- */
  function storeBackUrl() {
    var main = document.querySelector("#main-content");
    var backUrl = main && main.dataset ? main.dataset.backurl : null;
    if (backUrl) sessionStorage.setItem("backUrl", backUrl);
  }

  /* ---- update the post back button (BackButton.astro) ---- */
  function updateGoBackUrl() {
    var backButton = document.querySelector("#back-button");
    var backUrl = sessionStorage.getItem("backUrl");
    if (backUrl && backButton) backButton.href = backUrl;
  }

  function init() {
    toggleNav();
    handleSkipToContent();
    storeBackUrl();
    updateGoBackUrl();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
