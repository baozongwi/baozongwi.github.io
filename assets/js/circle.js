(function () {
  var feed = document.getElementById("circle-feed");
  if (!feed) return;

  var PAGE = 30;
  var items = Array.prototype.slice.call(feed.querySelectorAll(".circle-item"));
  var filters = document.querySelectorAll("[data-circle-filter]");
  var pager = document.getElementById("circle-pager");
  var prevBtn = document.getElementById("circle-prev");
  var nextBtn = document.getElementById("circle-next");
  var pageInfo = document.getElementById("circle-page-info");
  var fish = document.getElementById("circle-fish");
  var fishSlot = document.getElementById("circle-fish-slot");
  var fishSwap = document.getElementById("circle-fish-swap");
  var group = "all";
  var author = "";
  var page = 1;
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
    var pages = Math.max(1, Math.ceil(pool.length / PAGE));
    if (page > pages) page = pages;
    if (page < 1) page = 1;
    var start = (page - 1) * PAGE;
    var visible = new Set(pool.slice(start, start + PAGE));
    var last = pool[Math.min(pool.length, start + PAGE) - 1];
    items.forEach(function (el) {
      el.classList.toggle("is-hidden", !visible.has(el));
      el.classList.toggle("is-page-end", el === last);
    });
    if (!pager) return;
    if (pool.length > PAGE) pager.removeAttribute("hidden");
    else pager.setAttribute("hidden", "");
    if (pageInfo) pageInfo.textContent = page + " / " + pages;
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= pages;
  }

  function scrollToList() {
    var anchor = document.querySelector(".circle-filters") || feed;
    var top = anchor.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  function setFilter(nextGroup, nextAuthor) {
    group = nextGroup;
    author = nextAuthor || "";
    page = 1;
    filters.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-circle-filter") === group && !author);
    });
    apply();
  }

  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setFilter(btn.getAttribute("data-circle-filter") || "all", "");
      scrollToList();
    });
  });

  feed.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-filter-author]");
    if (!btn || (fish && fish.contains(btn))) return;
    setFilter("all", btn.getAttribute("data-filter-author") || "");
    filters.forEach(function (b) {
      b.classList.remove("is-active");
    });
    scrollToList();
  });

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      if (page <= 1) return;
      page -= 1;
      apply();
      scrollToList();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      page += 1;
      apply();
      scrollToList();
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
