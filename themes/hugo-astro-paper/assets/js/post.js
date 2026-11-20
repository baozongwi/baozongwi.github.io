/* Post page behaviour — port of the inline script in posts/[...slug]/index.astro
   plus the TOC scrollspy (PostToc.astro) and the post FAB (BackToTopButton.astro). */
(function () {
  /* ---- top reading progress bar ---- */
  function createProgressBar() {
    var progressContainer = document.createElement("div");
    progressContainer.className =
      "progress-container fixed top-0 z-10 h-1 w-full bg-background";

    var progressBar = document.createElement("div");
    progressBar.className = "progress-bar h-1 w-0 bg-accent";
    progressBar.id = "myBar";

    progressContainer.appendChild(progressBar);
    document.body.appendChild(progressContainer);
  }

  function updateScrollProgress() {
    document.addEventListener("scroll", function () {
      var winScroll =
        document.body.scrollTop || document.documentElement.scrollTop;
      var height =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      var scrolled = (winScroll / height) * 100;
      var myBar = document.getElementById("myBar");
      if (myBar) myBar.style.width = scrolled + "%";
    });
  }

  /* ---- heading anchor links ---- */
  function addHeadingLinks(articleEl) {
    var a = articleEl || document.getElementById("article");
    if (!a) return;
    var headings = Array.prototype.slice.call(
      a.querySelectorAll(":is(h2, h3, h4, h5, h6)")
    );
    headings.forEach(function (heading) {
      heading.classList.add("group");
      var link = document.createElement("a");
      link.className = "heading-link ms-2 no-underline";
      link.href = "#" + heading.id;

      var span = document.createElement("span");
      span.setAttribute("aria-hidden", "true");
      span.innerText = "#";
      link.appendChild(span);
      heading.appendChild(link);
    });
  }

  /* ---- copy buttons on code blocks ---- */
  function attachCopyButtons(scope) {
    var root = scope || document;
    var copyButtonLabel = "Copy";
    var codeBlocks = Array.prototype.slice.call(root.querySelectorAll("pre"));

    codeBlocks.forEach(function (codeBlock) {
      var wrapper = document.createElement("div");
      wrapper.style.position = "relative";

      var copyButton = document.createElement("button");
      copyButton.className = "copy-code";
      copyButton.innerHTML = copyButtonLabel;
      codeBlock.setAttribute("tabindex", "0");
      codeBlock.appendChild(copyButton);

      if (codeBlock.parentNode) {
        codeBlock.parentNode.insertBefore(wrapper, codeBlock);
      }
      wrapper.appendChild(codeBlock);

      copyButton.addEventListener("click", async function () {
        await copyCode(codeBlock, copyButton);
      });
    });

    async function copyCode(block, button) {
      var code = block.querySelector("code");
      var text = code ? code.innerText : "";

      await navigator.clipboard.writeText(text || "");

      button.innerText = "Copied";
      setTimeout(function () {
        button.innerText = copyButtonLabel;
      }, 700);
    }
  }

  /* ---- wrap wide tables (rehypeTableWrapper equivalent) ---- */
  function wrapTables(scope) {
    var root = scope || document;
    var tables = Array.prototype.slice.call(
      root.querySelectorAll(".app-prose table, .article-content table")
    );
    tables.forEach(function (table) {
      if (table.parentElement && table.parentElement.classList)
        if (table.parentElement.classList.contains("table-wrapper")) return;
      var wrapper = document.createElement("div");
      wrapper.className = "table-wrapper";
      if (table.parentNode) table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  /* ---- accessible image lightbox ---- */
  function initLightbox(articleEl) {
    var article = articleEl || document.getElementById("article");
    if (!article) return;

    var prefersReducedMotion = function () {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    };

    var overlay = null;
    var lastFocused = null;
    var removeDragListeners = null;

    // Defer attribute mutations so they don't push the LCP timestamp.
    requestAnimationFrame(function () {
      var images = Array.prototype.slice.call(article.querySelectorAll("img"));
      images.forEach(function (image) {
        if (image.closest("a")) return;
        image.setAttribute("role", "button");
        image.setAttribute("tabindex", "0");
        image.setAttribute("aria-haspopup", "dialog");
        image.setAttribute(
          "aria-label",
          image.alt ? "Zoom image: " + image.alt : "Zoom image"
        );
      });
    });

    function open(src, alt, trigger) {
      if (overlay) return;
      lastFocused = trigger || document.activeElement;

      overlay = document.createElement("div");
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute(
        "aria-label",
        alt ? "Image preview: " + alt : "Image preview"
      );
      overlay.className = "lightbox-overlay";

      var closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.setAttribute("aria-label", "Close image preview");
      closeButton.className = "lightbox-close";
      closeButton.innerHTML = "&#10005;";
      closeButton.addEventListener("click", close);

      var image = document.createElement("img");
      image.src = src;
      image.alt = "";
      image.className = "lightbox-image";

      overlay.append(closeButton, image);
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay && currentScale <= 1) close();
      });

      var currentScale = 1;
      var translateX = 0;
      var translateY = 0;
      var initialDist = 0;
      var initialScale = 1;
      var panStartX = 0;
      var panStartY = 0;
      var panStartTranslateX = 0;
      var panStartTranslateY = 0;
      var lastTapTime = 0;

      function applyTransform() {
        image.style.transform =
          "scale(" + currentScale + ") translate(" + translateX + "px, " + translateY + "px)";
        // A backdrop click only closes at fit size, so drop the zoom-out
        // cursor while zoomed.
        if (overlay) overlay.style.cursor = currentScale <= 1 ? "" : "default";
      }

      function resetTransform() {
        currentScale = 1;
        translateX = 0;
        translateY = 0;
        image.style.transform = "";
        if (overlay) overlay.style.cursor = "";
      }

      // Keep the zoomed image from being panned past its edges.
      function clampTranslate() {
        if (!overlay) return;
        var maxX = Math.max(
          0,
          (image.clientWidth - overlay.clientWidth / currentScale) / 2
        );
        var maxY = Math.max(
          0,
          (image.clientHeight - overlay.clientHeight / currentScale) / 2
        );
        translateX = Math.min(maxX, Math.max(-maxX, translateX));
        translateY = Math.min(maxY, Math.max(-maxY, translateY));
      }

      overlay.addEventListener(
        "touchstart",
        function (e) {
          var t = e.touches;
          if (t.length === 2) {
            initialDist = Math.hypot(
              t[1].clientX - t[0].clientX,
              t[1].clientY - t[0].clientY
            );
            initialScale = currentScale;
          } else if (t.length === 1) {
            var now = Date.now();
            if (now - lastTapTime < 300) {
              e.preventDefault();
              if (currentScale > 1) {
                resetTransform();
              } else {
                currentScale = 2;
                translateX = 0;
                translateY = 0;
                applyTransform();
              }
              lastTapTime = 0;
              panStartX = t[0].clientX;
              panStartY = t[0].clientY;
              panStartTranslateX = translateX;
              panStartTranslateY = translateY;
            } else {
              lastTapTime = now;
              if (currentScale > 1) {
                panStartX = t[0].clientX;
                panStartY = t[0].clientY;
                panStartTranslateX = translateX;
                panStartTranslateY = translateY;
              }
            }
          }
        },
        { passive: false }
      );

      overlay.addEventListener(
        "touchmove",
        function (e) {
          var t = e.touches;
          if (t.length === 2) {
            e.preventDefault();
            var dist = Math.hypot(
              t[1].clientX - t[0].clientX,
              t[1].clientY - t[0].clientY
            );
            var oldScale = currentScale;
            currentScale = Math.min(
              4,
              Math.max(1, initialScale * (dist / initialDist))
            );

            // Zoom to the geometric center of the two fingers
            var midX = (t[0].clientX + t[1].clientX) / 2;
            var midY = (t[0].clientY + t[1].clientY) / 2;
            var ox = overlay.clientWidth / 2;
            var oy = overlay.clientHeight / 2;
            translateX =
              (midX - ox) * (1 / currentScale - 1 / oldScale) + translateX;
            translateY =
              (midY - oy) * (1 / currentScale - 1 / oldScale) + translateY;
            clampTranslate();
            applyTransform();
          } else if (t.length === 1) {
            if (currentScale > 1) {
              e.preventDefault();
              translateX =
                panStartTranslateX + (t[0].clientX - panStartX) / currentScale;
              translateY =
                panStartTranslateY + (t[0].clientY - panStartY) / currentScale;
              clampTranslate();
              applyTransform();
            } else {
              e.preventDefault();
            }
          }
        },
        { passive: false }
      );

      overlay.addEventListener("touchend", function (e) {
        if (e.touches.length === 0 && currentScale <= 1.05) resetTransform();
      });

      overlay.addEventListener("touchcancel", function (e) {
        if (e.touches.length === 0 && currentScale <= 1.05) resetTransform();
      });

      overlay.addEventListener(
        "wheel",
        function (e) {
          e.preventDefault();
          var oldScale = currentScale;
          var delta = -e.deltaY * 0.001;
          currentScale = Math.min(4, Math.max(1, currentScale * (1 + delta)));

          if (currentScale <= 1.05) {
            resetTransform();
          } else {
            // Zoom to cursor: the point under the cursor stays fixed
            var ox = overlay.clientWidth / 2;
            var oy = overlay.clientHeight / 2;
            translateX =
              (e.clientX - ox) * (1 / currentScale - 1 / oldScale) + translateX;
            translateY =
              (e.clientY - oy) * (1 / currentScale - 1 / oldScale) + translateY;
            clampTranslate();
            applyTransform();
          }
        },
        { passive: false }
      );

      var isMouseDown = false;
      var mouseStartX = 0;
      var mouseStartY = 0;

      overlay.addEventListener("mousedown", function (e) {
        if (e.button !== 0 || currentScale <= 1) return;
        if (e.target.closest("button")) return;
        isMouseDown = true;
        mouseStartX = e.clientX;
        mouseStartY = e.clientY;
        panStartTranslateX = translateX;
        panStartTranslateY = translateY;
        e.preventDefault();
      });

      function onMouseMove(e) {
        if (!isMouseDown || !overlay) return;
        translateX =
          panStartTranslateX + (e.clientX - mouseStartX) / currentScale;
        translateY =
          panStartTranslateY + (e.clientY - mouseStartY) / currentScale;
        clampTranslate();
        applyTransform();
      }

      function onMouseUp() {
        if (!isMouseDown) return;
        isMouseDown = false;
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      removeDragListeners = function () {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.body.appendChild(overlay);
      document.documentElement.style.overflow = "hidden";
      document.addEventListener("keydown", onKeyDown);

      requestAnimationFrame(function () {
        if (overlay) overlay.classList.add("is-open");
      });
      closeButton.focus();
    }

    function close() {
      if (!overlay) return;
      var el = overlay;
      overlay = null;

      document.removeEventListener("keydown", onKeyDown);
      removeDragListeners && removeDragListeners();
      removeDragListeners = null;
      document.documentElement.style.overflow = "";
      lastFocused && lastFocused.focus();
      lastFocused = null;

      if (prefersReducedMotion()) {
        el.remove();
        return;
      }
      var remove = function () {
        el.remove();
      };
      el.addEventListener("transitionend", remove, { once: true });
      setTimeout(remove, 250); // fallback in case transitionend never fires
      el.classList.remove("is-open");
    }

    function onKeyDown(e) {
      if (e.key === "Escape") {
        close();
      } else if (e.key === "Tab") {
        trapFocus(e);
      }
    }

    // Keep keyboard focus inside the open dialog.
    function trapFocus(e) {
      if (!overlay) return;
      var focusables = overlay.querySelectorAll(
        'a[href], button, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function triggerFromEvent(e) {
      var image = e.target.closest ? e.target.closest("img") : null;
      if (!image || !article.contains(image) || image.closest("a")) return null;
      return image;
    }

    function activate(image) {
      open(image.currentSrc || image.src, image.alt, image);
    }

    article.addEventListener("click", function (e) {
      var image = triggerFromEvent(e);
      if (!image) return;
      e.preventDefault();
      activate(image);
    });

    article.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
      var image = triggerFromEvent(e);
      if (!image) return;
      e.preventDefault();
      activate(image);
    });
  }

  /* ---- post FAB: back-to-top (BackToTopButton.astro) ---- */
  function initPostFab() {
    var root = document.documentElement;
    var fab = document.getElementById("post-fab");
    var button = fab ? fab.querySelector("button") : null;
    var progress = fab ? fab.querySelector(".post-fab-progress") : null;
    var popover = document.getElementById("toc-popover");
    var sideToc = document.querySelector(".toc-side nav");
    if (!fab || !button || !progress) return;

    var scrollToTop = function () {
      root.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    var opensToc = button.hasAttribute("data-has-toc");

    var onButtonClick = function () {
      if (!opensToc) scrollToTop();
    };

    var closePopover = function () {
      if (popover && popover.hidePopover && popover.matches(":popover-open")) {
        popover.hidePopover();
      }
    };
    var onDocClick = function (e) {
      var target = e.target;
      if (target.closest(".toc-popover [data-back-to-top]")) {
        scrollToTop();
        closePopover();
      } else if (target.closest(".toc-popover a")) {
        closePopover();
      }
    };

    // The scroll spy can't scroll a hidden popover, so catch up on open.
    var onToggle = function (e) {
      var list = popover ? popover.querySelector("nav .toc-list") : null;
      if (e.newState !== "open" || !list) return;
      var active = list.querySelector("[aria-current]");
      if (active && list.scrollHeight > list.clientHeight) {
        list.scrollTop = active.offsetTop - list.clientHeight / 2;
      }
    };

    var lastVisible = null;
    var frame = 0;
    function update() {
      frame = 0;
      // CSS hides a side TOC with no room, but can't tell the button from there.
      fab.toggleAttribute("data-side-toc-hidden", sideToc && sideToc.offsetWidth === 0);
      // A popover left open would outlive the button that closes it.
      if (fab.offsetWidth === 0) closePopover();

      var scrollTotal = root.scrollHeight - root.clientHeight;
      var ratio = scrollTotal > 0 ? root.scrollTop / scrollTotal : 0;
      progress.style.setProperty("--progress", ratio * 100 + "%");

      // A TOC button is useful from the start; back to top only once scrolled.
      var isVisible = opensToc || ratio > 0.3;
      if (isVisible !== lastVisible) {
        fab.toggleAttribute("data-visible", isVisible);
        lastVisible = isVisible;
      }
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    button.addEventListener("click", onButtonClick);
    document.addEventListener("click", onDocClick);
    if (popover) popover.addEventListener("toggle", onToggle);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
  }

  function enhanceArticle(article) {
    addHeadingLinks(article);
    attachCopyButtons(article);
    wrapTables(article);
    initLightbox(article);
  }

  function init() {
    var article = document.getElementById("article");
    if (article) {
      createProgressBar();
      updateScrollProgress();
      enhanceArticle(article);
    } else {
      wrapTables(document);
    }
    initPostFab();
  }

  // Encrypted posts: encrypt.js replaces the lock screen with the decrypted
  // article at runtime — rerun the article enhancements on it.
  document.addEventListener("astropaper:enhance", function (e) {
    enhanceArticle(e.detail);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
