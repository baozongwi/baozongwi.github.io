(function () {
  var pageRoot = document.querySelector(".circle-page");
  var feed = document.getElementById("circle-feed");
  if (!pageRoot || !feed) return;

  var PAGE = 30;
  var items = [];
  var pager = document.getElementById("circle-pager");
  var prevBtn = document.getElementById("circle-prev");
  var nextBtn = document.getElementById("circle-next");
  var pageInfo = document.getElementById("circle-page-info");
  var fish = document.getElementById("circle-fish");
  var fishSlot = document.getElementById("circle-fish-slot");
  var fishSwap = document.getElementById("circle-fish-swap");
  var countEl = pageRoot.querySelector("[data-circle-count]");
  var updatedWrap = pageRoot.querySelector("[data-circle-meta-updated]");
  var updatedEl = pageRoot.querySelector("[data-circle-updated]");
  var author = "";
  var page = 1;
  var fishIndex = -1;
  var origin = "";

  function visiblePool() {
    return items.filter(function (el) {
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
    var anchor = document.querySelector(".circle-meta") || feed;
    var top = anchor.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  function setAuthor(nextAuthor) {
    author = nextAuthor || "";
    page = 1;
    apply();
  }

  feed.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-filter-author]");
    if (!btn || (fish && fish.contains(btn))) return;
    var next = btn.getAttribute("data-filter-author") || "";
    setAuthor(author === next ? "" : next);
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
    clone.classList.remove("is-hidden", "is-page-end");
    clone.removeAttribute("id");
    clone.querySelectorAll("img").forEach(function (img) {
      img.addEventListener("error", function () {
        img.classList.add("is-broken");
      });
    });
    fishSlot.replaceChildren(clone);
    fish.removeAttribute("hidden");
  }

  if (fishSwap) fishSwap.addEventListener("click", pickFish);

  function shanghai(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var diff = (Date.now() - d.getTime()) / 1000;
    if (diff >= 0 && diff < 3600) return Math.max(1, Math.floor(diff / 60)) + " 分钟前";
    if (diff >= 0 && diff < 86400) return Math.floor(diff / 3600) + " 小时前";
    if (diff >= 0 && diff < 86400 * 7) return Math.floor(diff / 86400) + " 天前";
    try {
      return d.toLocaleString("sv-SE", { timeZone: "Asia/Shanghai", hour12: false }).replace("T", " ").slice(0, 16);
    } catch (e) {
      return iso.slice(0, 10);
    }
  }

  function stampTimes(root) {
    (root || document).querySelectorAll("[data-circle-time], [data-circle-updated]").forEach(function (el) {
      var iso = el.getAttribute("datetime");
      if (!iso) return;
      var text = shanghai(iso);
      if (text) el.textContent = text;
    });
  }

  function summaryText(value) {
    return String(value || "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  function avatarUrl(src) {
    if (!src) return "";
    if (src.charAt(0) === "/" && origin) return origin + src;
    return src;
  }

  function firstLetter(name) {
    var chars = Array.from(String(name || ""));
    return chars.length ? chars[0] : "";
  }

  function renderPost(post) {
    var name = post.author || "";
    var article = document.createElement("article");
    article.className = "circle-item";
    article.setAttribute("data-author", name);

    var media = document.createElement("div");
    media.className = "circle-item__media";
    var src = avatarUrl(post.avatar || "");
    if (src) {
      var img = document.createElement("img");
      img.className = "circle-item__avatar";
      img.src = src;
      img.alt = "";
      img.width = 42;
      img.height = 42;
      img.loading = "lazy";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", function () {
        img.classList.add("is-broken");
      });
      media.appendChild(img);
    }
    var fallback = document.createElement("span");
    fallback.className = "circle-item__fallback";
    fallback.setAttribute("aria-hidden", "true");
    fallback.textContent = firstLetter(name);
    media.appendChild(fallback);

    var body = document.createElement("div");
    body.className = "circle-item__body";
    var head = document.createElement("div");
    head.className = "circle-item__head";
    var authorBtn = document.createElement("button");
    authorBtn.type = "button";
    authorBtn.className = "circle-item__author";
    authorBtn.setAttribute("data-filter-author", name);
    authorBtn.textContent = name;
    head.appendChild(authorBtn);
    if (post.published) {
      var time = document.createElement("time");
      time.dateTime = post.published;
      time.setAttribute("datetime", post.published);
      time.setAttribute("data-circle-time", "");
      time.textContent = String(post.published).slice(0, 10);
      head.appendChild(time);
    }

    var link = document.createElement("a");
    link.className = "circle-item__main";
    link.href = post.link || "#";
    link.target = "_blank";
    link.rel = "noopener";
    var title = document.createElement("span");
    title.className = "circle-item__title";
    title.textContent = post.title || "";
    link.appendChild(title);
    var summary = summaryText(post.summary);
    if (summary) {
      var sum = document.createElement("span");
      sum.className = "circle-item__summary";
      sum.textContent = summary;
      link.appendChild(sum);
    }

    body.appendChild(head);
    body.appendChild(link);
    article.appendChild(media);
    article.appendChild(body);
    return article;
  }

  function showMessage(text) {
    feed.replaceChildren();
    var p = document.createElement("p");
    p.className = "circle-empty";
    p.textContent = text;
    feed.appendChild(p);
    items = [];
    if (fish) fish.setAttribute("hidden", "");
    if (pager) pager.setAttribute("hidden", "");
    if (countEl) countEl.textContent = "";
  }

  function render(data) {
    var posts = data && Array.isArray(data.posts) ? data.posts : [];
    if (!posts.length) {
      showMessage("还没有最近六个月的更新。");
      return;
    }
    feed.replaceChildren();
    items = posts.map(renderPost);
    items.forEach(function (el) {
      feed.appendChild(el);
    });
    if (countEl) countEl.textContent = posts.length + " 篇";
    if (updatedEl && data.updated_at) {
      updatedEl.setAttribute("datetime", data.updated_at);
      if (updatedWrap) updatedWrap.removeAttribute("hidden");
    }
    author = "";
    page = 1;
    fishIndex = -1;
    stampTimes(pageRoot);
    apply();
    pickFish();
  }

  var endpoint = pageRoot.getAttribute("data-circle-endpoint") || "";
  try {
    origin = new URL(endpoint).origin;
  } catch (e) {
    origin = "";
  }
  if (!endpoint) {
    showMessage("还没有最近六个月的更新。");
    return;
  }

  fetch(endpoint, { credentials: "omit" })
    .then(function (res) {
      if (!res.ok) throw new Error("http " + res.status);
      return res.json();
    })
    .then(render)
    .catch(function () {
      showMessage("这次没读到更新。");
    });
})();
