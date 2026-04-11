+++
title= "Hugo博客密码插件设计"
slug= "hugo-password-design"
description= ""
date= "2026-04-11T15:05:23+08:00"
lastmod= "2026-04-11T15:05:23+08:00"
image= ""
license= ""
categories= ["talk"]
tags= [""]

password = "password-design"
password_hint = "密码为 password-design"

+++

GPT5.4 解决不了的问题，CC opus4.6 可以解决，你没有解决你的问题，肯定是你的 AI 不够努力，使用方式

```bash
hugo --minify --buildFuture --cleanDestinationDir
node scripts/encrypt.js
```

加密的 js 如下，示例密码为 `js111`

{{< encrypt password="js111" hint="输入密码查看加密示例" >}}

```js
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ENCRYPT_BLOCK_RE = /<div\s+class=(?:"([^"]*\bencrypt-container\b[^"]*)"|([^\s>]*\bencrypt-container\b[^\s>]*))\s+data-encrypt-password-b64=(?:"([^"]+)"|([^\s>]+))(?:\s+data-encrypt-hint-b64=(?:"([^"]*)"|([^\s>]+)))?\s*>\s*<template\s+class=(?:"encrypt-content-b64"|encrypt-content-b64)>([\s\S]*?)<\/template>\s*<\/div>/g;
const GENERIC_DESCRIPTION = 'Protected content is hidden until the correct password is entered.';
const SEARCH_INDEX_PATHS = [
  path.join(PUBLIC_DIR, 'index.json'),
  path.join(PUBLIC_DIR, 'search', 'index.json'),
];

function findFiles(dir, extension, results = []) {
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(full, extension, results);
      continue;
    }

    if (entry.name.endsWith(extension)) {
      results.push(full);
    }
  }

  return results;
}

function decodeBase64(value) {
  return Buffer.from(decodeHtmlEntities(value.trim()), 'base64').toString('utf8');
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function encryptContent(password, plaintext) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    ct: Buffer.concat([encrypted, tag]).toString('base64'),
  };
}

function buildLockedMarkup({ salt, iv, ct, hint }) {
  const safeHint = escapeHtml(hint || 'This content is encrypted. Enter password to view.');

  return [
    '<div class="encrypt-container">',
    `  <div class="encrypt-locked" data-salt="${salt}" data-iv="${iv}" data-ct="${ct}">`,
    '    <div class="encrypt-prompt">',
    '      <div class="encrypt-badge" aria-hidden="true">',
    '        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">',
    '          <rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect>',
    '          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>',
    '        </svg>',
    '      </div>',
    `      <p class="encrypt-hint">${safeHint}</p>`,
    '      <form class="encrypt-form" onsubmit="return false;">',
    '        <input type="password" class="encrypt-input" placeholder="Password" autocomplete="off" spellcheck="false">',
    '        <button type="submit" class="encrypt-btn">Unlock</button>',
    '      </form>',
    '      <p class="encrypt-error" hidden>Incorrect password</p>',
    '    </div>',
    '  </div>',
    '</div>',
  ].join('\n');
}

function getPermalink(file) {
  const relativePath = path.relative(PUBLIC_DIR, file).replaceAll(path.sep, '/');

  if (relativePath === 'index.html') return '/';
  if (!relativePath.endsWith('/index.html')) return null;

  return `/${relativePath.slice(0, -'index.html'.length)}`;
}

function normalizePermalink(value) {
  if (!value) return value;

  try {
    return new URL(value, 'https://example.invalid').pathname;
  } catch (error) {
    return value;
  }
}

function transformHtml(html, permalink, encryptedPermalinks) {
  let replaced = 0;

  const transformed = html.replace(ENCRYPT_BLOCK_RE, (
    match,
    quotedClass,
    bareClass,
    quotedPasswordB64,
    barePasswordB64,
    quotedHintB64 = '',
    bareHintB64 = '',
    contentB64
  ) => {
    const passwordB64 = quotedPasswordB64 || barePasswordB64;
    const hintB64 = quotedHintB64 || bareHintB64;
    const password = decodeBase64(passwordB64);
    const hint = hintB64 ? decodeBase64(hintB64) : '';
    const nestedSource = decodeBase64(contentB64);
    const nestedResult = transformHtml(nestedSource, permalink, encryptedPermalinks);
    const { salt, iv, ct } = encryptContent(password, nestedResult.html);

    replaced += 1 + nestedResult.replaced;
    if (permalink) {
      encryptedPermalinks.add(permalink);
    }

    return buildLockedMarkup({ salt, iv, ct, hint });
  });

  return { html: transformed, replaced };
}

function sanitizeHtmlMetadata(html) {
  return html
    .replace(
      /<meta name=['"]description['"]\s+content=(['"])([\s\S]*?)\1\s*\/?>/i,
      `<meta name="description" content="${GENERIC_DESCRIPTION}">`
    )
    .replace(
      /<meta property=['"]og:description['"]\s+content=(['"])([\s\S]*?)\1\s*\/?>/i,
      `<meta property="og:description" content="${GENERIC_DESCRIPTION}">`
    )
    .replace(
      /<meta name=['"]twitter:description['"]\s+content=(['"])([\s\S]*?)\1\s*\/?>/i,
      `<meta name="twitter:description" content="${GENERIC_DESCRIPTION}">`
    );
}

function sanitizeSearchIndex(encryptedPermalinks) {
  for (const searchIndexPath of SEARCH_INDEX_PATHS) {
    if (!fs.existsSync(searchIndexPath)) continue;

    const raw = fs.readFileSync(searchIndexPath, 'utf8');
    const entries = JSON.parse(raw);

    const updated = entries.map(entry => {
      if (!encryptedPermalinks.has(normalizePermalink(entry.permalink))) {
        return entry;
      }

      return {
        ...entry,
        content: '',
        description: GENERIC_DESCRIPTION,
      };
    });

    fs.writeFileSync(searchIndexPath, JSON.stringify(updated), 'utf8');
  }
}

function sanitizeFeeds(encryptedPermalinks) {
  for (const file of findFiles(PUBLIC_DIR, '.xml')) {
    const xml = fs.readFileSync(file, 'utf8');
    const sanitized = xml.replace(/<item>[\s\S]*?<\/item>/g, item => {
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);
      if (!linkMatch) return item;

      const permalink = new URL(linkMatch[1].trim()).pathname;
      if (!encryptedPermalinks.has(permalink)) return item;

      return item
        .replace(/<description>[\s\S]*?<\/description>/i, `<description>${GENERIC_DESCRIPTION}</description>`)
        .replace(/<content:encoded>[\s\S]*?<\/content:encoded>/i, `<content:encoded>${GENERIC_DESCRIPTION}</content:encoded>`);
    });

    if (sanitized !== xml) {
      fs.writeFileSync(file, sanitized, 'utf8');
    }
  }
}

if (!fs.existsSync(PUBLIC_DIR)) {
  console.error(`Public directory not found: ${PUBLIC_DIR}`);
  process.exit(1);
}

let totalEncrypted = 0;
const encryptedPermalinks = new Set();

for (const file of findFiles(PUBLIC_DIR, '.html')) {
  const originalHtml = fs.readFileSync(file, 'utf8');
  const permalink = getPermalink(file);
  const transformed = transformHtml(originalHtml, permalink, encryptedPermalinks);

  if (!transformed.replaced) {
    continue;
  }

  const finalHtml = sanitizeHtmlMetadata(transformed.html);
  fs.writeFileSync(file, finalHtml, 'utf8');
  totalEncrypted += transformed.replaced;
  console.log(`  Encrypted: ${path.relative(PUBLIC_DIR, file)}`);
}

sanitizeSearchIndex(encryptedPermalinks);
sanitizeFeeds(encryptedPermalinks);

console.log(`\nDone. ${totalEncrypted} block(s) encrypted across ${encryptedPermalinks.size} page(s).`);
```


{{< /encrypt >}}



自己在后台写文章时有两种用法：

1. 整篇文章加密

只有在你想把整篇正文都锁住时，才需要在文章头里写 `password`。

我这个博客当前默认是 `TOML` 头，也就是 `+++` 和 `=` 写法，所以示例应该写成：

```toml
+++
title = "测试"
password = "hello123"
password_hint = "输入文章密码"
+++
```

如果你用的是 `YAML` 头，也可以写成 `---` 加 `:`，两种 Hugo 都支持，只要和你的文章头格式一致就行。

2. 只加密局部段落

这种情况下不需要在文章头里写 `password`，直接在正文里写 shortcode 就行：

```
{{< encrypt password="meow" hint="输入段落密码" >}}
这里是加密内容
{{< /encrypt >}}
```
