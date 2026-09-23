(function() {
  var locked = document.querySelector('.encrypt-locked');
  if (!locked) return;

  var form = locked.querySelector('.encrypt-form');
  var input = locked.querySelector('.encrypt-input');
  var error = locked.querySelector('.encrypt-error');
  var btn = locked.querySelector('.encrypt-btn');
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
      'raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return await window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
  }

  // 从解密后的正文 headings 生成无序号的嵌套目录。
  // 加密文章的 stub 没有正文，模板渲染的 .TableOfContents 是空的，
  // 所以 TOC 必须解密后从注入的正文里现建。
  function buildTOC(article) {
    var headings = article.querySelectorAll('h1[id], h2[id], h3[id], h4[id]');
    if (!headings.length) return null;
    var nav = document.createElement('nav');
    var root = document.createElement('ul');
    var stack = [{ level: 1, list: root }];
    headings.forEach(function(h) {
      var level = parseInt(h.tagName.charAt(1), 10);
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
      stack[stack.length - 1].list.appendChild(li);
      var child = document.createElement('ul');
      li.appendChild(child);
      stack.push({ level: level, list: child });
    });
    nav.querySelectorAll('ul').forEach(function(ul) {
      if (ul.children.length === 0) ul.remove();
    });
    nav.appendChild(root);
    return nav;
  }

  // 把生成的 TOC 填入正文右侧目录；正文无标题则移除目录。
  function hydrateTOC(article) {
    var nav = buildTOC(article);
    var asideToc = document.querySelector('.read__toc .toc');
    if (!nav) {
      var asideEl = document.querySelector('.read__toc');
      if (asideEl) asideEl.remove();
      var tocBtn = document.getElementById('toc-btn');
      if (tocBtn) tocBtn.remove();
      var readEl = document.querySelector('.read');
      if (readEl) readEl.classList.remove('is-toc-open');
      return;
    }
    if (asideToc) {
      var oldAsideNav = asideToc.querySelector('nav');
      if (oldAsideNav) oldAsideNav.replaceWith(nav);
      else asideToc.appendChild(nav);
    }
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    var password = input.value;
    if (!password) { error.removeAttribute('hidden'); return; }

    var salt = locked.dataset.salt;
    var iv = locked.dataset.iv;
    var ct = locked.dataset.ct;
    if (!salt || !iv || !ct) return;

    btn.disabled = true;
    error.setAttribute('hidden', '');

    try {
      var key = await deriveKey(password, b64ToBytes(salt));
      // Web Crypto expects the 16-byte GCM tag appended to the ciphertext —
      // which is exactly how scripts/encrypt.mjs lays it out.
      var plaintext = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64ToBytes(iv) },
        key,
        b64ToBytes(ct)
      );

      var container = locked.closest('.encrypt-container');
      if (!container) return;

      var tpl = document.getElementById('post-reward-tpl');
      var reward = tpl ? tpl.content.cloneNode(true) : null;

      // Re-wrap in .article-content so the existing post styles and the
      // enhancement scripts (which key off .article-content) apply.
      var body = document.createElement('div');
      body.className = 'article-content';
      body.innerHTML = textDecoder.decode(plaintext);
      if (reward) body.appendChild(reward);
      container.replaceWith(body);
      if (tpl) tpl.remove();

      // 解密后：补 TOC（侧栏 + 抽屉），再让增强脚本 + scrollspy 重新绑定
      hydrateTOC(body);
      document.dispatchEvent(new CustomEvent('flavor:enhance', { detail: body }));
    } catch (err) {
      console.error('解密失败', err);
      error.removeAttribute('hidden');
    } finally {
      btn.disabled = false;
    }
  });
})();
