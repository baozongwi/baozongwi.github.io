(function () {
  var root = document.querySelector(".gh-cal");
  if (!root) return;

  var scroller = root.querySelector(".gh-cal__scroll");
  var tip = root.querySelector(".gh-cal__tip");
  var current = null;

  function showLatest() {
    if (!scroller) return;
    if (scroller.scrollWidth > scroller.clientWidth + 1) {
      scroller.scrollLeft = scroller.scrollWidth;
    }
  }

  function place(cell) {
    if (!tip || tip.hidden) return;
    var rect = cell.getBoundingClientRect();
    var tipRect = tip.getBoundingClientRect();
    var margin = 8;
    var x = rect.left + rect.width / 2 - tipRect.width / 2;
    var y = rect.top - tipRect.height - 10;
    var dir = "n";
    if (y < 78) {
      y = rect.bottom + 10;
      dir = "s";
    }
    x = Math.max(margin, Math.min(x, window.innerWidth - tipRect.width - margin));
    tip.style.left = x + "px";
    tip.style.top = y + "px";
    tip.dataset.dir = dir;
    tip.style.setProperty("--arrow-x", (rect.left + rect.width / 2 - x) + "px");
  }

  function show(cell) {
    if (!tip) return;
    var text = cell.getAttribute("data-tip");
    if (!text) return;
    current = cell;
    tip.textContent = text;
    tip.hidden = false;
    place(cell);
  }

  function hide() {
    current = null;
    if (tip) tip.hidden = true;
  }

  root.addEventListener("pointerover", function (event) {
    var cell = event.target.closest(".gh-cal__grid .gh-cal__cell");
    if (cell) show(cell);
  });

  root.addEventListener("pointerout", function (event) {
    var cell = event.target.closest(".gh-cal__grid .gh-cal__cell");
    if (!cell) return;
    var next = event.relatedTarget && event.relatedTarget.closest
      ? event.relatedTarget.closest(".gh-cal__grid .gh-cal__cell")
      : null;
    if (next !== cell) hide();
  });

  root.addEventListener("click", function (event) {
    var cell = event.target.closest(".gh-cal__grid .gh-cal__cell");
    if (cell) show(cell);
  });

  document.addEventListener("pointerdown", function (event) {
    if (!event.target.closest(".gh-cal__grid .gh-cal__cell")) hide();
  });

  window.addEventListener("scroll", function () {
    if (current) place(current);
  }, true);

  if (scroller) {
    scroller.addEventListener("scroll", function () {
      if (current) place(current);
    });
  }

  showLatest();
  window.addEventListener("load", showLatest);
})();
