#!/usr/bin/env node
// 文章级 AES-256-GCM 加密（仓库不存明文）。
// 配合 assets/js/encrypt.js 在浏览器端用 Web Crypto 解密。
//
// 从 Hugo 站点根目录调用（脚本会自己往上找 hugo.yaml / hugo.toml）：
//   1. --prepare        content/private/ → content/post/<slug>/（明文 md + 图）
//   2. hugo             HUGO_ENCRYPT_PLAIN=1 渲染明文（默认 public/，
//                       可用 ENCRYPT_PLAIN_DIR 指到临时目录，推荐）
//   3. --list           列出需要（重新）加密的文章（slug\ttitle）
//   4. --slug <slug>    加密明文正文 → data/encrypted/<slug>.json，content 恢复成 stub
//   5. --stubify-all    兜底：所有加密文章的 content 都是 stub
//   6. --check <slug>   只检查明文页是否可提取（不写任何文件），排障用
//
//   node themes/flavor/scripts/encrypt.mjs --list
//   ENCRYPT_PASSWORD=xxx node themes/flavor/scripts/encrypt.mjs --slug <slug>
//   ENCRYPT_PLAIN_DIR=/tmp/plain node themes/flavor/scripts/encrypt.mjs --check <slug>
//   bash themes/flavor/scripts/encrypt.sh
//
// 注意：hugo server 默认会把页面渲染到 public/，任何在跑的预览进程都可能在
// 加密流程中途覆盖 public/。所以 update.sh 把明文构建到独立临时目录，并用
// ENCRYPT_PLAIN_DIR 告诉本脚本去哪里读取。
//
// 明文源在 content/private/（应 gitignore），仓库提交 content stub + 图 + data 密文。
// 图放 content/post/<slug>/assets/，部署 hugo 转 webp；密文里的 src 与之一致。
// 依赖：仅 node 内置模块。

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function findHugoRoot(start) {
  let dir = start;
  for (;;) {
    const isTheme = fs.existsSync(path.join(dir, 'theme.toml'));
    const hasContent = fs.existsSync(path.join(dir, 'content'));
    if (!isTheme && hasContent) {
      for (const f of ['hugo.toml', 'hugo.yaml', 'hugo.yml', 'config.toml', 'config.yaml', 'config.yml']) {
        if (fs.existsSync(path.join(dir, f))) return dir;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      console.error('找不到 Hugo 站点根目录（缺少 hugo.yaml / hugo.toml）');
      process.exit(1);
    }
    dir = parent;
  }
}

const ROOT = findHugoRoot(path.resolve(import.meta.dirname));
const PRIVATE_DIR = path.join(ROOT, 'content/private');
const CONTENT_POST = path.join(ROOT, 'content/post');
// Where the plaintext (HUGO_ENCRYPT_PLAIN=1) build lives. update.sh points this
// at a throwaway directory so a concurrent `hugo server` (which also writes
// public/) cannot swap the page for the encrypted-lock variant mid-run.
const PUBLIC_DIR = process.env.ENCRYPT_PLAIN_DIR
  ? path.resolve(process.env.ENCRYPT_PLAIN_DIR)
  : path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data/encrypted');

const PBKDF2_ITER = 100000;
const KEY_LEN = 32;
const SALT_LEN = 16;
const IV_LEN = 12;

const STUB_NOTE = '<!-- 本文正文已加密，密文见 data/encrypted/。源文件在 content/private/。 -->';

function splitFrontMatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  return { fm: m[1], body: m[2] };
}

// Only the body counts for "needs re-encryption": editing frontmatter (a tag,
// the featured flag, the slug) must not force another password prompt.
function bodyHashOf(raw) {
  const parts = splitFrontMatter(raw);
  const body = parts ? parts.body : raw;
  return crypto.createHash('sha256').update(body, 'utf8').digest('hex');
}

function parseFrontMatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = m[1];
  const get = (key) => {
    const r = fm.match(new RegExp('^' + key + ':\\s*["\']?(.+?)["\']?\\s*$', 'm'));
    return r ? r[1].trim() : null;
  };
  return {
    encrypted: get('encrypted') === 'true',
    slug: get('slug'),
    title: get('title') || '',
  };
}

function scanPrivate() {
  if (!fs.existsSync(PRIVATE_DIR)) return [];
  const posts = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(p);
      } else if (entry.name.endsWith('.md')) {
        const raw = fs.readFileSync(p, 'utf8');
        const info = parseFrontMatter(raw);
        if (!info || !info.encrypted) continue;
        info.bodyHash = bodyHashOf(raw);
        if (!info.slug) { console.error(`[skip] ${entry.name}: 缺少 slug，加密文章必须在 front matter 设置 slug`); continue; }
        info.privatePath = p;
        info.mtimeMs = fs.statSync(p).mtimeMs;
        posts.push(info);
      }
    }
  };
  walk(PRIVATE_DIR);
  return posts;
}

const contentPathFor = (slug) => path.join(CONTENT_POST, slug, 'index.md');
const dataPathFor = (slug) => path.join(DATA_DIR, slug + '.json');

function copyAssetsSync(srcDir, dstDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(dstDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name.endsWith('.md')) continue;
    const s = path.join(srcDir, entry.name);
    const d = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      copyAssetsSync(s, d);
    } else {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
    }
  }
}

function prepare() {
  for (const info of scanPrivate()) {
    const srcDir = path.dirname(info.privatePath);
    const contentDstDir = path.dirname(contentPathFor(info.slug));

    fs.mkdirSync(contentDstDir, { recursive: true });
    fs.copyFileSync(info.privatePath, contentPathFor(info.slug));
    // 图进 page bundle（content/post/<slug>/assets/），和普通文一样走 webp。
    // stubify 只改 index.md，图留在仓库里给 GitHub Actions 的 hugo 处理。
    copyAssetsSync(srcDir, contentDstDir);
  }
}

function listNeeded(all = false) {
  for (const info of scanPrivate()) {
    const dp = dataPathFor(info.slug);
    if (all || !fs.existsSync(dp)) {
      console.log(`${info.slug}\t${info.title}`);
      continue;
    }
    let stored = null;
    try {
      stored = JSON.parse(fs.readFileSync(dp, 'utf8'));
    } catch (e) {
      stored = null;
    }
    if (stored && stored.bodyHash) {
      // Body unchanged → nothing to re-encrypt, even if the file was touched.
      if (stored.bodyHash !== info.bodyHash) console.log(`${info.slug}\t${info.title}`);
      continue;
    }
    // Legacy ciphertext (no body hash yet): keep the old mtime heuristic.
    if (info.mtimeMs > fs.statSync(dp).mtimeMs) console.log(`${info.slug}\t${info.title}`);
  }
}

function rewriteImageURLs(html, slug) {
  // 旧密文 / 旧 hook 可能写出 /post/:slug/。webp 地址是 /c/post/:slug/，不含 src="/post/"。
  return html.replaceAll(`src="/post/${slug}/`, `src="/p/${slug}/`);
}

function extractArticleHTML(slug) {
  const htmlPath = path.join(PUBLIC_DIR, 'p', slug, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`未找到 ${htmlPath}，请先 HUGO_ENCRYPT_PLAIN=1 hugo`);
  }
  const html = rewriteImageURLs(fs.readFileSync(htmlPath, 'utf8'), slug);
  const openRe = /<div class="[^"]*article-content[^"]*"[^>]*>/i;
  const open = openRe.exec(html);
  if (!open) {
    const locked = /class="[^"]*encrypt-locked[^"]*"/i.test(html);
    throw new Error(
      locked
        ? `${htmlPath} 是「加密锁定」态：说明这份 HTML 不是带 HUGO_ENCRYPT_PLAIN=1 渲染出来的（常见原因：hugo server 等其它进程把 public/ 覆盖了）。用 update.sh 的流程会把明文渲染到临时目录；或手动指定 ENCRYPT_PLAIN_DIR。`
        : `${htmlPath} 中未找到 <div class="article-content">（确认已 --prepare 且 hugo）`
    );
  }
  const contentStart = open.index + open[0].length;
  let depth = 1;
  const re = /<div\b|<\/div>/gi;
  re.lastIndex = contentStart;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[0] === '</div>') {
      depth--;
      if (depth === 0) return html.slice(contentStart, m.index);
    } else {
      depth++;
    }
  }
  throw new Error(`${htmlPath} 中 article-content 未闭合`);
}

function encryptHTML(html, password) {
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITER, KEY_LEN, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([
    cipher.update(html, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return { salt: salt.toString('base64'), iv: iv.toString('base64'), ct: ct.toString('base64') };
}

function stubify(contentPath) {
  if (!fs.existsSync(contentPath)) return;
  const raw = fs.readFileSync(contentPath, 'utf8');
  const m = raw.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)[\s\S]*$/);
  if (!m) return;
  fs.writeFileSync(contentPath, m[1] + '\n' + STUB_NOTE + '\n');
}

function encryptOne(slug) {
  const password = process.env.ENCRYPT_PASSWORD;
  if (!password) { console.error('缺少密码：请通过 ENCRYPT_PASSWORD 环境变量提供'); process.exit(1); }
  const info = scanPrivate().find((p) => p.slug === slug);
  if (!info) {
    console.error(`[skip] content/private 里没有 slug=${slug} 的明文源，无法记录正文哈希`);
    process.exit(1);
  }
  const html = extractArticleHTML(slug);
  const data = encryptHTML(html, password);
  // Recorded so a later frontmatter-only edit does not ask for the password again.
  data.bodyHash = info.bodyHash;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(dataPathFor(slug), JSON.stringify(data, null, 2) + '\n');
  stubify(contentPathFor(slug));
  console.log(`[ok] ${slug}（${html.length} bytes 明文 → data/encrypted/${slug}.json，content 已 stub 化）`);
}

function stubifyAll() {
  for (const info of scanPrivate()) stubify(contentPathFor(info.slug));
}

function main() {
  const [cmd, arg] = process.argv.slice(2);
  switch (cmd) {
    case '--prepare': prepare(); break;
    case '--list': listNeeded(); break;
    case '--list-all': listNeeded(true); break;
    case '--slug':
      if (!arg) { console.error('用法: --slug <slug>'); process.exit(1); }
      encryptOne(arg); break;
    case '--stubify-all': stubifyAll(); break;
    case '--check': {
      if (!arg) { console.error('用法: --check <slug>'); process.exit(1); }
      const html = extractArticleHTML(arg);
      console.log(`[ok] ${arg}：可提取明文正文 ${html.length} bytes（源：${PUBLIC_DIR}）`);
      break;
    }
    default:
      console.error('用法: node encrypt.mjs --prepare | --list | --list-all | --slug <slug> | --stubify-all | --check <slug>');
      process.exit(1);
  }
}

main();
