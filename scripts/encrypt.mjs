#!/usr/bin/env node
// 文章级 AES-256-GCM 加密（模型 B：仓库不存明文）。
// 配合 themes/flavor/assets/js/encrypt.js 在浏览器端用 Web Crypto 解密。
//
// update.sh 自动编排：
//   1. --prepare        content/private/<slug>.md → content/post/<slug>/index.md（临时完整版）
//   2. hugo             HUGO_ENCRYPT_PLAIN=1 渲染明文 public
//   3. --list           列出需要（重新）加密的文章（slug\ttitle）
//   4. --slug <slug>    加密 public 正文 → data/encrypted/<slug>.json，并把 content 恢复成 stub
//   5. --stubify-all    兜底：确保所有加密文章的 content 都是 stub（无明文残留）
//
// 手动：
//   node scripts/encrypt.mjs --list
//   ENCRYPT_PASSWORD=xxx node scripts/encrypt.mjs --slug <slug>
//
// 明文源在 content/private/（gitignore），仓库只提交 content stub + data 密文。
// 依赖：仅 node 内置模块。

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PRIVATE_DIR = path.join(ROOT, 'content/private');
const CONTENT_POST = path.join(ROOT, 'content/post');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data/encrypted');

const PBKDF2_ITER = 100000;
const KEY_LEN = 32;   // AES-256
const SALT_LEN = 16;
const IV_LEN = 12;

const STUB_NOTE = '<!-- 本文正文已加密，密文见 data/encrypted/。源文件在 content/private/，编辑后跑 ./update.sh。 -->';

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

// 扫描 content/private/ 下标记 encrypted: true 的文章
function scanPrivate() {
  if (!fs.existsSync(PRIVATE_DIR)) return [];
  const posts = [];
  for (const file of fs.readdirSync(PRIVATE_DIR)) {
    if (!file.endsWith('.md')) continue;
    const p = path.join(PRIVATE_DIR, file);
    const info = parseFrontMatter(fs.readFileSync(p, 'utf8'));
    if (!info || !info.encrypted) continue;
    if (!info.slug) { console.error(`[skip] ${file}: 缺少 slug，加密文章必须在 front matter 设置 slug`); continue; }
    info.privatePath = p;
    info.mtimeMs = fs.statSync(p).mtimeMs;
    posts.push(info);
  }
  return posts;
}

const contentPathFor = (slug) => path.join(CONTENT_POST, slug, 'index.md');
const dataPathFor = (slug) => path.join(DATA_DIR, slug + '.json');

// private 明文源 → content（临时完整版，供 hugo 渲染）
function prepare() {
  for (const info of scanPrivate()) {
    const dst = contentPathFor(info.slug);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(info.privatePath, dst);
  }
}

// 需要（重新）加密：data 不存在，或 private 比 data 新
function listNeeded() {
  for (const info of scanPrivate()) {
    const dp = dataPathFor(info.slug);
    if (!fs.existsSync(dp) || info.mtimeMs > fs.statSync(dp).mtimeMs) {
      console.log(`${info.slug}\t${info.title}`);
    }
  }
}

// 用 div 深度匹配从渲染产物提取 .article-content 的 innerHTML。
// 不能用非贪婪正则——正文里有 <div class="table-wrapper"> 等嵌套 div。
function extractArticleHTML(slug) {
  const htmlPath = path.join(PUBLIC_DIR, 'p', slug, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`未找到 ${htmlPath}，请先 HUGO_ENCRYPT_PLAIN=1 hugo`);
  }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const startTag = '<div class="article-content">';
  const start = html.indexOf(startTag);
  if (start === -1) throw new Error(`${htmlPath} 中未找到 <div class="article-content">（确认已 --prepare 且 hugo）`);
  let depth = 1;
  const re = /<div\b|<\/div>/gi;
  re.lastIndex = start + startTag.length;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[0] === '</div>') {
      depth--;
      if (depth === 0) return html.slice(start + startTag.length, m.index);
    } else {
      depth++;
    }
  }
  throw new Error(`${htmlPath} 中 article-content 未闭合`);
}

// AES-256-GCM + PBKDF2-SHA256，与浏览器 Web Crypto 完全对齐：
//   key = PBKDF2(password, salt, 100000, SHA-256, 32)
//   ct  = AES-256-GCM(key, iv, plaintext) || tag[16]   ← Web Crypto 约定 tag 在密文末尾
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

// content md → stub（只留 front matter + 注释，剥离正文）
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
  const html = extractArticleHTML(slug);
  const data = encryptHTML(html, password);
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
    case '--slug':
      if (!arg) { console.error('用法: --slug <slug>'); process.exit(1); }
      encryptOne(arg); break;
    case '--stubify-all': stubifyAll(); break;
    default:
      console.error('用法: node scripts/encrypt.mjs --prepare | --list | --slug <slug> | --stubify-all');
      process.exit(1);
  }
}

main();
