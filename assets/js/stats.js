(function() {
  var cfg = window.flavorStats;
  if (!cfg) return;

  var pvEl = document.getElementById("flavor-stats-pv");
  var uvEl = document.getElementById("flavor-stats-uv");
  if (!pvEl && !uvEl) return;

  var CACHE_KEY = "flavor-stats";
  var host = location.hostname;
  var isLocal = host === "localhost" || host === "127.0.0.1";

  function format(n) {
    n = Math.max(0, parseInt(n, 10) || 0);
    return n.toLocaleString("en-US");
  }

  function render(pv, uv) {
    if (pvEl) pvEl.textContent = format(pv);
    if (uvEl) uvEl.textContent = format(uv);
  }

  function cacheGet() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data.pv !== "number") return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function cacheSet(pv, uv) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ pv: pv, uv: uv }));
    } catch (e) {}
  }

  var basePV = parseInt(cfg.pv, 10) || 0;
  var baseUV = parseInt(cfg.uv, 10) || 0;
  render(basePV, baseUV);

  var cached = cacheGet();
  if (cached && cached.pv >= basePV) render(cached.pv, cached.uv);

  if (isLocal || !cfg.endpoint) return;

  var isNew = !/(?:^|;\s*)flavor_uv=1(?:;|$)/.test(document.cookie);
  fetch(String(cfg.endpoint).replace(/\/$/, "") + "/hit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uv: isNew }),
    credentials: "include",
    mode: "cors"
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (!data) return;
      render(data.pv, data.uv);
      cacheSet(data.pv, data.uv);
      if (isNew) {
        document.cookie = "flavor_uv=1; path=/; max-age=315360000; SameSite=Lax";
      }
    })
    .catch(function() {});
})();
