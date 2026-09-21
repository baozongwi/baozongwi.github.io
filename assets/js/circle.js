(function () {
  var feed = document.getElementById("circle-feed");
  if (!feed) return;

  var PAGE = 20;
  var items = Array.prototype.slice.call(feed.querySelectorAll(".circle-item"));
  var filters = document.querySelectorAll("[data-circle-filter]");
  var moreBtn = document.getElementById("circle-more");
  var fish = document.getElementById("circle-fish");
  var fishSlot = document.getElementById("circle-fish-slot");
  var fishSwap = document.getElementById("circle-fish-swap");
  var group = "all";
  var author = "";
  var shown = PAGE;
  var fishIndex = -1;

  function visiblePool() {
    return items.filter(function (el) {
      if (group !== "all" && el.getAttribute("data-group") !== group) return false;
      if (author && el.getAttribute("data-author") !== author) return false;
      return true;
    });
  }

  function apply() {
    var pool = visiblePool();
    var count = 0;
    items.forEach(function (el) {
      var ok = pool.indexOf(el) !== -1;
      if (!ok) {
        el.classList.add("is-hidden");
        return;
      }
      count += 1;
      if (count <= shown) el.classList.remove("is-hidden");
      else el.classList.add("is-hidden");
    });
    if (moreBtn) {
      if (pool.length > shown) moreBtn.removeAttribute("hidden");
      else moreBtn.setAttribute("hidden", "");
    }
  }

  function setFilter(nextGroup, nextAuthor) {
    group = nextGroup;
    author = nextAuthor || "";
    shown = PAGE;
    filters.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-circle-filter") === group && !author);
    });
    apply();
  }

  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setFilter(btn.getAttribute("data-circle-filter") || "all", "");
    });
  });

  feed.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-filter-author]");
    if (!btn || fish && fish.contains(btn)) return;
    setFilter("all", btn.getAttribute("data-filter-author") || "");
    filters.forEach(function (b) {
      b.classList.remove("is-active");
    });
  });

  if (moreBtn) {
    moreBtn.addEventListener("click", function () {
      shown += PAGE;
      apply();
    });
  }

  function pickFish() {
    if (!fish || !fishSlot || items.length === 0) return;
    var pool = items.slice();
    if (pool.length > 1 && fishIndex >= 0) {
      pool.splice(fishIndex, 1);
    }
    var pick = pool[Math.floor(Math.random() * pool.length)];
    fishIndex = items.indexOf(pick);
    var clone = pick.cloneNode(true);
    clone.classList.remove("is-hidden");
    clone.removeAttribute("id");
    fishSlot.replaceChildren(clone);
    fish.removeAttribute("hidden");
  }

  if (fishSwap) fishSwap.addEventListener("click", pickFish);
  if (items.length) pickFish();

  function shanghai(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var now = Date.now();
    var diff = (now - d.getTime()) / 1000;
    if (diff >= 0 && diff < 3600) return Math.max(1, Math.floor(diff / 60)) + " 分钟前";
    if (diff >= 0 && diff < 86400) return Math.floor(diff / 3600) + " 小时前";
    if (diff >= 0 && diff < 86400 * 7) return Math.floor(diff / 86400) + " 天前";
    try {
      return d.toLocaleString("sv-SE", { timeZone: "Asia/Shanghai", hour12: false }).replace("T", " ").slice(0, 16);
    } catch (e) {
      return iso.slice(0, 10);
    }
  }

  document.querySelectorAll("[data-circle-time], [data-circle-updated]").forEach(function (el) {
    var iso = el.getAttribute("datetime");
    if (!iso) return;
    var text = shanghai(iso);
    if (text) el.textContent = text;
  });

  apply();
})();
