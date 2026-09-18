(function() {
  var cfg = window.flavorGuestbook;
  var form = document.getElementById("guestbook-form");
  var listEl = document.getElementById("guestbook-list");
  var statusEl = document.getElementById("guestbook-status");
  var countEl = document.getElementById("guestbook-count");
  var titleEl = document.getElementById("guestbook-title");
  if (!form || !listEl) return;

  var endpoint = cfg && cfg.endpoint ? String(cfg.endpoint).replace(/\/$/, "") + "/guestbook" : "";
  var TOKEN_KEY = "flavor-jingtu-token";
  var admin = false;
  var titleClicks = 0;
  var titleTimer = 0;

  function token() {
    try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }

  function setToken(v) {
    try {
      if (v) sessionStorage.setItem(TOKEN_KEY, v);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }

  function setStatus(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.className = "guestbook-form__status" + (kind ? " is-" + kind : "");
  }

  function fmtTime(ts) {
    var d = new Date(ts * 1000);
    if (isNaN(d.getTime())) return "";
    try {
      return d.toLocaleString("sv-SE", { timeZone: "Asia/Shanghai", hour12: false }).replace("T", " ").slice(0, 16);
    } catch (e) {
      var pad = function(n) { return n < 10 ? "0" + n : "" + n; };
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function authHeaders() {
    var h = { "Content-Type": "application/json" };
    var t = token();
    if (t) h.Authorization = "Bearer " + t;
    return h;
  }

  function setAdmin(on) {
    admin = !!on;
    document.body.classList.toggle("is-gb-admin", admin);
  }

  function unlock() {
    var t = token();
    if (!t) t = window.prompt("口令");
    if (!t) return;
    setToken(t);
    fetch(endpoint + "/auth", { method: "GET", headers: authHeaders(), credentials: "include", mode: "cors" })
      .then(function(res) {
        if (!res.ok) throw new Error("forbidden");
        setAdmin(true);
        load();
      })
      .catch(function() {
        setToken("");
        setAdmin(false);
        setStatus("口令不对", "error");
      });
  }

  function render(messages) {
    listEl.textContent = "";
    if (!messages || !messages.length) {
      listEl.appendChild(el("li", "guestbook-list__empty", "还没有人说话，来写第一条吧"));
      if (countEl) countEl.hidden = true;
      return;
    }
    if (countEl) {
      countEl.hidden = false;
      countEl.textContent = "共 " + messages.length + " 条";
    }
    messages.forEach(function(m) {
      var li = el("li", "guestbook-list__item");
      li.dataset.id = m && m.id ? String(m.id) : "";
      var meta = el("div", "guestbook-list__meta");
      var name = (m && m.name) ? String(m.name) : "匿名";
      meta.appendChild(el("span", "guestbook-list__name", name));
      meta.appendChild(el("time", "guestbook-list__time", fmtTime(m && m.time)));
      li.appendChild(meta);
      li.appendChild(el("p", "guestbook-list__text", m && m.text ? String(m.text) : ""));

      var replies = (m && m.replies && m.replies.length) ? m.replies : [];
      if ((!replies.length) && m && m.reply && m.reply.text) replies = [m.reply];
      if (replies.length) {
        var details = document.createElement("details");
        details.className = "guestbook-reply";
        details.open = true;
        details.appendChild(el("summary", "guestbook-reply__sum", "对话（" + replies.length + "）"));
        var body = el("div", "guestbook-reply__body");
        replies.forEach(function(rep) {
          var item = el("div", "guestbook-thread__item" + (rep && rep.owner ? " is-owner" : ""));
          var rm = el("div", "guestbook-list__meta");
          rm.appendChild(el("span", "guestbook-list__name", rep && rep.name ? String(rep.name) : (rep && rep.owner ? "baozongwi" : "匿名")));
          if (rep && rep.time) rm.appendChild(el("time", "guestbook-list__time", fmtTime(rep.time)));
          item.appendChild(rm);
          item.appendChild(el("p", "guestbook-reply__text", rep && rep.text ? String(rep.text) : ""));
          body.appendChild(item);
        });
        details.appendChild(body);
        li.appendChild(details);
      }

      var follow = document.createElement("form");
      follow.className = "guestbook-follow-form";
      follow.setAttribute("data-follow-form", "1");
      var fr = el("div", "guestbook-form__row");
      var fn = document.createElement("input");
      fn.type = "text"; fn.name = "name"; fn.maxLength = 24; fn.required = true; fn.placeholder = "昵称"; fn.setAttribute("aria-label", "昵称");
      var fe = document.createElement("input");
      fe.type = "email"; fe.name = "email"; fe.maxLength = 80; fe.placeholder = "邮箱（可选）"; fe.setAttribute("aria-label", "邮箱");
      fr.appendChild(fn); fr.appendChild(fe);
      var hp = document.createElement("input");
      hp.type = "text"; hp.name = "company"; hp.className = "guestbook-form__hp"; hp.tabIndex = -1; hp.autocomplete = "off"; hp.setAttribute("aria-hidden", "true");
      var fta = document.createElement("textarea");
      fta.name = "text"; fta.maxLength = 500; fta.rows = 2; fta.required = true; fta.placeholder = "继续说…";
      var fa = el("div", "guestbook-form__actions");
      var fsend = el("button", "guestbook-form__submit", "跟帖");
      fsend.type = "submit";
      fa.appendChild(fsend);
      follow.appendChild(fr); follow.appendChild(hp); follow.appendChild(fta); follow.appendChild(fa);
      li.appendChild(follow);

      var box = el("div", "guestbook-reply-box");
      var btn = el("button", "guestbook-reply-box__toggle", "回复");
      btn.type = "button";
      btn.setAttribute("data-reply-btn", "1");
      var rf = document.createElement("form");
      rf.className = "guestbook-reply-form";
      rf.hidden = true;
      var ta = document.createElement("textarea");
      ta.name = "text";
      ta.maxLength = 500;
      ta.rows = 3;
      ta.required = true;
      ta.placeholder = "写下回复…";
      var actions = el("div", "guestbook-form__actions");
      var send = el("button", "guestbook-form__submit", "发送");
      send.type = "submit";
      actions.appendChild(send);
      rf.appendChild(ta);
      rf.appendChild(actions);
      box.appendChild(btn);
      box.appendChild(rf);
      li.appendChild(box);

      listEl.appendChild(li);
    });
  }

  function load() {
    if (!endpoint) {
      render([]);
      setStatus("净土还没配好", "error");
      return;
    }
    fetch(endpoint, { credentials: "include", mode: "cors" })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        render(data && data.messages ? data.messages : []);
      })
      .catch(function() {
        render([]);
        setStatus("暂时连不上净土", "error");
      });
  }

  form.addEventListener("submit", function(ev) {
    ev.preventDefault();
    if (!endpoint) return;
    var fd = new FormData(form);
    var whisper = form.querySelector("input[name=whisper]");
    var payload = {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      text: String(fd.get("text") || "").trim(),
      company: String(fd.get("company") || ""),
      whisper: !!(whisper && whisper.checked)
    };
    if (!payload.name || !payload.text) {
      setStatus("昵称和内容都要填", "error");
      return;
    }
    if (payload.whisper && !payload.email) {
      setStatus("悄悄话想收到回复必填", "error");
      return;
    }
    var btn = form.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    setStatus("在送…");
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
      mode: "cors"
    })
      .then(function(res) {
        return res.json().then(function(data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function(out) {
        if (!out.ok) {
          if (out.status === 429) throw new Error("rate");
          throw new Error((out.data && out.data.error) || "fail");
        }
        var wasWhisper = payload.whisper;
        form.reset();
        if (wasWhisper) {
          setStatus("悄悄话已送到，不会出现在墙上", "ok");
        } else {
          setStatus("已送出", "ok");
        }
        load();
      })
      .catch(function(err) {
        var msg = "暂时发不出去";
        if (err && err.message === "rate") msg = "写得太勤了，过两分钟再来";
        else if (err && err.message === "name") msg = "昵称不太对";
        else if (err && err.message === "text") msg = "内容不太对";
        else if (err && err.message === "email") msg = "邮箱不太对";
        setStatus(msg, "error");
      })
      .then(function() {
        if (btn) btn.disabled = false;
      });
  });

  listEl.addEventListener("click", function(ev) {
    var btn = ev.target.closest("[data-reply-btn]");
    if (!btn || !listEl.contains(btn)) return;
    var box = btn.parentNode;
    var rf = box.querySelector(".guestbook-reply-form");
    if (!rf) return;
    rf.hidden = !rf.hidden;
    if (!rf.hidden) {
      var ta = rf.querySelector("textarea");
      if (ta) ta.focus();
    }
  });

  listEl.addEventListener("submit", function(ev) {
    var ff = ev.target.closest("[data-follow-form]");
    if (ff && listEl.contains(ff)) {
      ev.preventDefault();
      var li = ff.closest(".guestbook-list__item");
      var id = li && li.dataset.id;
      var fd = new FormData(ff);
      var payload = {
        id: id,
        name: String(fd.get("name") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        text: String(fd.get("text") || "").trim(),
        company: String(fd.get("company") || "")
      };
      if (!payload.id || !payload.name || !payload.text) {
        setStatus("昵称和内容都要填", "error");
        return;
      }
      var fsend = ff.querySelector("button[type=submit]");
      if (fsend) fsend.disabled = true;
      setStatus("在送…");
      fetch(endpoint + "/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
        mode: "cors"
      })
        .then(function(res) {
          return res.json().then(function(data) {
            return { ok: res.ok, status: res.status, data: data };
          }).catch(function() { return { ok: res.ok, status: res.status, data: {} }; });
        })
        .then(function(out) {
          if (!out.ok) {
            if (out.status === 429) throw new Error("rate");
            throw new Error((out.data && out.data.error) || "fail");
          }
          ff.reset();
          setStatus("已跟帖", "ok");
          load();
        })
        .catch(function(err) {
          var msg = "暂时发不出去";
          if (err && err.message === "rate") msg = "写得太勤了，过两分钟再来";
          else if (err && err.message === "name") msg = "昵称不太对";
          else if (err && err.message === "text") msg = "内容不太对";
          else if (err && err.message === "email") msg = "邮箱不太对";
          else if (err && err.message === "full") msg = "这条对话太长了";
          setStatus(msg, "error");
        })
        .then(function() { if (fsend) fsend.disabled = false; });
      return;
    }

    var rf = ev.target.closest(".guestbook-reply-form");
    if (!rf || !listEl.contains(rf)) return;
    ev.preventDefault();
    if (!admin) {
      unlock();
      return;
    }
    var li = rf.closest(".guestbook-list__item");
    var id = li && li.dataset.id;
    var ta = rf.querySelector("textarea");
    var text = ta ? String(ta.value || "").trim() : "";
    if (!id || !text) return;
    var send = rf.querySelector("button[type=submit]");
    if (send) send.disabled = true;
    fetch(endpoint + "/reply", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ id: id, text: text }),
      credentials: "include",
      mode: "cors"
    })
      .then(function(res) {
        return res.json().then(function(data) {
          return { ok: res.ok, status: res.status, data: data };
        }).catch(function() {
          return { ok: res.ok, status: res.status, data: {} };
        });
      })
      .then(function(out) {
        if (out.status === 403) {
          setToken("");
          setAdmin(false);
          setStatus("口令不对", "error");
          return;
        }
        if (!out.ok) throw new Error((out.data && out.data.error) || "fail");
        setStatus("回复已送出", "ok");
        load();
      })
      .catch(function() {
        setStatus("回复没发出去", "error");
      })
      .then(function() {
        if (send) send.disabled = false;
      });
  });

  if (titleEl) {
    titleEl.addEventListener("click", function() {
      titleClicks++;
      clearTimeout(titleTimer);
      titleTimer = setTimeout(function() { titleClicks = 0; }, 600);
      if (titleClicks >= 3) {
        titleClicks = 0;
        unlock();
      }
    });
  }

  if (token()) {
    fetch(endpoint + "/auth", { method: "GET", headers: authHeaders(), credentials: "include", mode: "cors" })
      .then(function(res) {
        if (res.ok) setAdmin(true);
        else setToken("");
      })
      .catch(function() {});
  }
  if (location.hash === "#manage") unlock();

  load();
})();
