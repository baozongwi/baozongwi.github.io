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

    function setMenu(open) {
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.setAttribute("aria-label", open ? closeLabel : openLabel);

      menuItems.classList.toggle("hidden", !open);
      menuIcon.classList.toggle("hidden", open);
      closeIcon.classList.toggle("hidden", !open);

      // Mobile only: lets the CSS give the open panel the full content width
      // (the title is taken out of the row while the menu is unfolded).
      var header = menuBtn.closest ? menuBtn.closest(".site-header") : null;
      if (header) header.classList.toggle("is-menu-open", open);
    }

    menuBtn.addEventListener("click", function () {
      setMenu(menuBtn.getAttribute("aria-expanded") !== "true");
    });

    // Escape closes the unfolded menu and hands focus back to the toggle.
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (menuBtn.getAttribute("aria-expanded") !== "true") return;
      setMenu(false);
      menuBtn.focus();
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

  /* ---- dynamic shared-element morphs for bulk listings ----
     The original theme puts view-transition-name on every card title.
     On pages with hundreds of cards (archives, tag index) the browser
     has to snapshot all of them on navigation → jank. Instead we set
     the name ONLY on the element being clicked, just before the
     navigation starts — one snapshot, same morph. */
  function setupDynamicVt() {
    document.addEventListener("click", function (e) {
      var link = e.target.closest ? e.target.closest("a.card-link, a.tag-link") : null;
      if (!link) return;

      // card title morph: h2/h3 inside the link
      var heading = link.querySelector("h2, h3");
      if (heading) {
        var href = link.getAttribute("href") || "";
        var slug = href.replace(/^\/+|\/+$/g, "").replace(/\//g, "-");
        heading.style.viewTransitionName = "post-" + slug;
        return;
      }

      // tag morph: the link itself
      if (link.classList.contains("tag-link")) {
        var text = link.textContent.trim();
        link.style.viewTransitionName = "tag-" + text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
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
    setupDynamicVt();
    storeBackUrl();
    updateGoBackUrl();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
