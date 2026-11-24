/* Encrypted post lock screen — ported from the flavor theme.
   PBKDF2(password, salt, 100k, SHA-256) → AES-GCM-256; the plaintext is the
   rendered article HTML produced by the site's encrypt pipeline. On success
   the form is replaced by the article and an `astropaper:enhance` event
   lets the enhancement scripts (heading links, copy buttons, lightbox,
   toc-fade) rebind onto the injected content. */
(function () {
  var locked = document.querySelector(".encrypt-locked");
  if (!locked) return;

  var form = locked.querySelector(".encrypt-form");
  var input = locked.querySelector(".encrypt-input");
  var error = locked.querySelector(".encrypt-error");
  var btn = locked.querySelector(".encrypt-btn");
  if (!form || !input || !btn) return;

  var textEncoder = new TextEncoder();
  var textDecoder = new TextDecoder();

  function b64ToBytes(b64) {
    var bin = window.atob(b64.trim());
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  // key = PBKDF2(password, salt, 100000, SHA-256) → AES-GCM-256
  async function deriveKey(password, salt) {
    var baseKey = await window.crypto.subtle.importKey(
      "raw", textEncoder.encode(password), "PBKDF2", false, ["deriveKey"]
    );
    return await window.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
  }

  // 从解密后的正文 headings 生成无序号的嵌套目录。
  // 加密文章的 stub 没有正文，模板渲染的目录是空的，
  // 所以 TOC 必须解密后从注入的正文里现建。
  function buildTOC(article) {
    var headings = article.querySelectorAll("h1[id], h2[id], h3[id], h4[id]");
    if (!headings.length) return null;
    var nav = document.createElement("nav");
    var root = document.createElement("ul");
    var stack = [{ level: 1, list: root }];
    headings.forEach(function (h) {
      var level = parseInt(h.tagName.charAt(1), 10);
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + h.id;
      // The heading now carries a trailing anchor marker; keep it out of
      // the generated table of contents.
      var label = h.cloneNode(true);
      var marker = label.querySelector(".heading-link");
      if (marker) marker.remove();
      a.textContent = label.textContent.trim();
      li.appendChild(a);
      while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
      stack[stack.length - 1].list.appendChild(li);
      var child = document.createElement("ul");
      li.appendChild(child);
      stack.push({ level: level, list: child });
    });
    nav.querySelectorAll("ul").forEach(function (ul) {
      if (ul.children.length === 0) ul.remove();
    });
    return root;
  }

  // 把生成的 TOC 填进标题下方的目录块；正文无标题则整块移除。
  function hydrateTOC(article) {
    var block = document.querySelector(".post-toc");
    var body = block && block.querySelector(".post-toc__body");
    if (!block || !body) return;
    var list = buildTOC(article);
    if (!list) { block.remove(); return; }
    var existing = body.querySelector("ul");
    if (existing) existing.replaceWith(list);
    else body.appendChild(list);
    block.hidden = false;
  }

  // Hugo degrades a fence whose language Chroma does not know (an unknown
  // label, or an invisible character such as a NBSP inside "java") to a bare
  // <pre><code class="language-x">: no .highlight wrapper, so the code styles,
  // the filename badge and the copy-button layout never apply. Ciphertext is a
  // frozen snapshot taken at encryption time, so posts encrypted before the
  // render hook learned to normalise the language keep that markup forever —
  // unless they are decrypted, repaired here, and (optionally) re-encrypted.
  var INVISIBLE = /[\u00a0\u200b\u200c\u200d\ufeff]/g;
  function normalizeCodeBlocks(root) {
    var codes = root.querySelectorAll("pre > code");
    Array.prototype.forEach.call(codes, function (code) {
      var pre = code.parentElement;
      if (!pre || pre.closest(".highlight")) return;
      var cls = (code.getAttribute("class") || "").replace(INVISIBLE, "");
      var lang = (code.getAttribute("data-lang") || "").replace(INVISIBLE, "");
      if (cls) code.setAttribute("class", cls);
      if (lang) code.setAttribute("data-lang", lang);
      var wrapper = document.createElement("div");
      wrapper.className = "highlight";
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      // Same class Chroma puts on a highlighted <pre>; keeps the base code
      // colour in both themes (the theme's .highlight pre wins on background).
      pre.classList.add("chroma");
    });
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var password = input.value;
    if (!password) { error.removeAttribute("hidden"); return; }

    var salt = locked.dataset.salt;
    var iv = locked.dataset.iv;
    var ct = locked.dataset.ct;
    if (!salt || !iv || !ct) return;

    btn.disabled = true;
    error.setAttribute("hidden", "");

    try {
      var key = await deriveKey(password, b64ToBytes(salt));
      // Web Crypto expects the 16-byte GCM tag appended to the ciphertext —
      // which is exactly how the site's encrypt pipeline lays it out.
      var plaintext = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: b64ToBytes(iv) },
        key,
        b64ToBytes(ct)
      );

      var container = locked.closest(".encrypt-container");
      if (!container) return;

      // Re-wrap as the theme's article container so the post styles and
      // enhancement scripts (keyed off #article / .app-prose) apply.
      var body = document.createElement("div");
      body.className = "article-content app-prose";
      body.id = "article";
      body.innerHTML = textDecoder.decode(plaintext);
      container.replaceWith(body);

      normalizeCodeBlocks(body);
      hydrateTOC(body);
      document.dispatchEvent(
        new CustomEvent("astropaper:enhance", { detail: body })
      );
    } catch (err) {
      console.error("解密失败", err);
      error.removeAttribute("hidden");
    } finally {
      btn.disabled = false;
    }
  });
})();
