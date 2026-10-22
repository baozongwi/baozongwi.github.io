#!/usr/bin/env node
/**
 * Fetch RSS/Atom from data/feeds.toml and write data/circle.json.
 *
 *   node scripts/fetch-circle.mjs
 *
 * A normal site push does not run this. The circle workflow does, then commits
 * this file. Timeout and a missing feed wait until next_probe. HTTP errors are
 * recorded as http <status> and tried again on the next schedule. A known feed
 * is requested with If-None-Match and If-Modified-Since.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import https from 'node:https';
import http from 'node:http';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'data/circle.json');
const AVATAR_DIR = resolve(ROOT, 'static/circle/avatars');
const AVATAR_MAP = resolve(ROOT, 'data/circle_avatars.json');
const REFRESH_AVATARS = process.argv.includes('--refresh-avatars');
const SLUG_OVERRIDE = { 国光: 'guoguang' };
const PER_FEED = 8;
const CONCURRENCY = 8;
const FEED_TIMEOUT_MS = 30000;
const PROBE_TIMEOUT_MS = 8000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_POSTS = 240;
const SINCE = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString();
})();
// 有人用 2099 把看板钉在自己博客最上面。圈子只收已经发表的，留一天给时区。
const UNTIL = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const UA = 'Mozilla/5.0 (compatible; FlavorCircle/1.0; +https://baozongwi.xyz/)';
const FEED_SUFFIXES = [
  'index.xml',
  'rss.xml',
  'atom.xml',
  'feed.xml',
  'feed/',
  'rss/',
  'index.rss',
  'feed/atom.xml',
  'rss/feed.xml',
  'index.php/feed/',
  'index.php/feed/atom/',
  'atom/',
  'search.xml',
];

function stripComment(line) {
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && line[i - 1] !== '\\') q = !q;
    if (c === '#' && !q) return line.slice(0, i);
  }
  return line;
}

function parseValue(raw) {
  const v = raw.trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v.startsWith('"')) {
    const m = v.match(/^"((?:\\.|[^"\\])*)"/);
    if (m) return m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  if (v.startsWith("'")) {
    const m = v.match(/^'([^']*)'/);
    if (m) return m[1];
  }
  return v;
}

function parseTomlTables(text) {
  const items = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = stripComment(raw).trim();
    if (!line) continue;
    const header = line.match(/^\[\[(\w+)\]\]$/);
    if (header) {
      if (current) items.push(current);
      current = { _table: header[1] };
      continue;
    }
    if (!current) continue;
    const kv = line.match(/^([A-Za-z_][\w]*)\s*=\s*(.+)$/);
    if (!kv) continue;
    current[kv[1]] = parseValue(kv[2]);
  }
  if (current) items.push(current);
  return items;
}

function loadToml(rel) {
  const p = resolve(ROOT, rel);
  if (!existsSync(p)) return [];
  return parseTomlTables(readFileSync(p, 'utf8'));
}

function loadPrev() {
  try {
    return JSON.parse(readFileSync(OUT, 'utf8'));
  } catch {
    return { posts: [], sites: [] };
  }
}

function decodeEntities(s) {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripHtml(s) {
  return decodeEntities(s)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[a-zA-Z/!][^>]*>?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inner(xml, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i');
  const m = xml.match(re);
  return m ? decodeEntities(m[1]).trim() : '';
}

function attr(tagXml, name) {
  const m = tagXml.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`, 'i'));
  return m ? m[1] || m[2] || m[3] || '' : '';
}

function atomLink(entry) {
  let fallback = '';
  const re = /<link\b([^>]*)\/?\s*>/gi;
  let m;
  while ((m = re.exec(entry))) {
    const href = attr(m[1], 'href');
    if (!href) continue;
    const rel = (attr(m[1], 'rel') || 'alternate').toLowerCase();
    if (rel === 'alternate') return href;
    if (!fallback) fallback = href;
  }
  return fallback;
}

function rssLink(item) {
  const tagged = inner(item, 'link');
  if (tagged && /^https?:/i.test(tagged)) return tagged;
  const m = item.match(/<link\b([^>]*)\/?\s*>/i);
  if (m) {
    const href = attr(m[1], 'href');
    if (href) return href;
  }
  const guid = inner(item, 'guid');
  if (guid && /^https?:/i.test(guid)) return guid;
  return tagged;
}

function parseDate(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  return d.toISOString();
}

function blocks(xml, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, 'gi');
  return xml.match(re) || [];
}

function normalizeLink(link, base) {
  if (!link) return '';
  try {
    const u = new URL(link, base || undefined);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '0.0.0.0') {
      if (!base) return '';
      const b = new URL(base);
      return new URL(u.pathname + u.search + u.hash, b.origin).href;
    }
    return u.href;
  } catch {
    return '';
  }
}

function parseFeed(xml, source) {
  const posts = [];
  const items = blocks(xml, 'item');
  const entries = items.length ? items : blocks(xml, 'entry');
  const base = source.rss || source.url;
  for (const block of entries) {
    const title = stripHtml(inner(block, 'title'));
    const link = normalizeLink(rssLink(block) || atomLink(block), base);
    if (!title || !link) continue;
    const published =
      parseDate(inner(block, 'pubDate')) ||
      parseDate(inner(block, 'published')) ||
      parseDate(inner(block, 'updated')) ||
      parseDate(inner(block, 'dc:date')) ||
      parseDate(inner(block, 'date'));
    const summaryRaw =
      inner(block, 'description') ||
      inner(block, 'summary') ||
      inner(block, 'content:encoded') ||
      inner(block, 'content');
    const summary = stripHtml(summaryRaw).slice(0, 180);
    if (!published || published < SINCE || published > UNTIL) continue;
    posts.push({
      title,
      link,
      published,
      summary,
      author: source.name,
      author_url: source.url,
      avatar: source.avatar || '',
      group: source.group,
    });
  }
  posts.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
  return posts.slice(0, PER_FEED);
}

function looksLikeFeed(body, contentType) {
  const ct = (contentType || '').toLowerCase();
  if (/rss|atom|xml/.test(ct) && /<(rss|feed|rdf)\b/i.test(body)) return true;
  return /<(rss|feed)\b/i.test(body.slice(0, 4000));
}

function looksLikeSearch(body) {
  const head = body.slice(0, 2500);
  return /<search[\s>]/.test(head) && /<entry[\s>]/.test(body.slice(0, 20000));
}

function dateFromPath(url) {
  const m = String(url).match(/\/(20\d{2})\/(\d{2})\/(\d{2})(?:\/|$)/);
  if (!m) return '';
  const iso = parseDate(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  return iso;
}

function toPost(source, title, link, published, summary) {
  if (!title || !link) return null;
  if (!published || published < SINCE || published > UNTIL) return null;
  return {
    title,
    link,
    published,
    summary: (summary || '').slice(0, 180),
    author: source.name,
    author_url: source.url,
    avatar: source.avatar || '',
    group: source.group,
  };
}

function parseSearchXml(xml, source) {
  const posts = [];
  for (const block of blocks(xml, 'entry')) {
    const title = stripHtml(inner(block, 'title'));
    const href = inner(block, 'url') || rssLink(block) || atomLink(block);
    const link = absUrl(source.url, href);
    const summary = stripHtml(inner(block, 'content')).slice(0, 180);
    const published = dateFromPath(link) || parseDate(inner(block, 'published') || inner(block, 'updated'));
    const post = toPost(source, title, link, published, summary);
    if (post) posts.push(post);
  }
  posts.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
  return posts.slice(0, PER_FEED);
}

function skipHref(href) {
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return true;
  const path = href.replace(/^https?:\/\/[^/]+/i, '');
  if (/^\/archives\/?$/i.test(path)) return true;
  return /\/(tags?|categories|css|js|images?|about|friends)(\/|$)/i.test(path);
}

function scrapeHtml(html, source) {
  const found = [];
  const seen = new Set();
  const base = source.url;

  function add(title, href, published, summary) {
    const link = absUrl(base, href);
    if (!link || skipHref(href) || seen.has(link)) return;
    const clean = stripHtml(title);
    if (!clean) return;
    seen.add(link);
    found.push({
      title: clean,
      link,
      published: published || '',
      summary: (summary || '').slice(0, 180),
      author: source.name,
      author_url: source.url,
      avatar: source.avatar || '',
      group: source.group,
    });
  }

  const heading = /<h[1-3][^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = heading.exec(html))) {
    const nearby = html.slice(m.index, m.index + 800);
    add(
      m[2],
      m[1],
      dateFromPath(m[1]) || parseDate((nearby.match(/datetime=["']([^"']+)/) || [])[1] || ''),
    );
  }

  const titled = /<a[^>]+href="([^"]*\/20\d{2}\/\d{2}\/\d{2}\/[^"]*)"[^>]*title="([^"]+)"/gi;
  while ((m = titled.exec(html))) {
    add(m[2], m[1], dateFromPath(m[1]));
  }

  const row = /<(?:article|div)[^>]*class="[^"]*(?:post-row|post-item|recent-post|article-item)[^"]*"[^>]*>[\s\S]{0,2500}?<\/(?:article|div)>/gi;
  while ((m = row.exec(html))) {
    const chunk = m[0];
    const href = (chunk.match(/<a[^>]+href="([^"]+)"/i) || [])[1] || '';
    const title = (chunk.match(/<h[1-3][^>]*>\s*<a[^>]+>([\s\S]*?)<\/a>/i) || chunk.match(/<span>([\s\S]*?)<\/span>/i) || [])[1] || '';
    const published =
      parseDate((chunk.match(/datetime=["']([^"']+)/) || [])[1] || '') ||
      parseDate((chunk.match(/class="time-m-d"[^>]*>([^<]+)/) || [])[1] || '') ||
      dateFromPath(href);
    add(title, href, published, stripHtml((chunk.match(/<p>([\s\S]*?)<\/p>/i) || [])[1] || ''));
  }

  const dated = /<a[^>]+href="([^"]*\/20\d{2}\/\d{2}\/\d{2}\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((m = dated.exec(html))) {
    const title = stripHtml(m[2]);
    if (title.length < 2) continue;
    add(title, m[1], dateFromPath(m[1]));
  }

  found.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
  return found.slice(0, PER_FEED);
}

const REQ_HEADERS = {
  'User-Agent': UA,
  Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5',
};

function isCertError(err) {
  const msg = `${err?.cause?.code || ''} ${err?.code || ''} ${err?.message || ''}`;
  return /CERT_|UNABLE_TO_VERIFY|certificate/i.test(msg);
}

function failResult(url, error) {
  return { ok: false, notModified: false, status: 0, body: '', contentType: '', url, etag: '', lastModified: '', error };
}

function requestInsecure(url, headers = {}, timeoutMs = FEED_TIMEOUT_MS, redirects = 0) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (err) {
      reject(err);
      return;
    }
    const lib = parsed.protocol === 'http:' ? http : https;
    const req = lib.get(
      url,
      {
        headers: { ...REQ_HEADERS, ...headers },
        timeout: timeoutMs,
        rejectUnauthorized: false,
      },
      (res) => {
        const loc = res.headers.location;
        if (loc && res.statusCode >= 300 && res.statusCode < 400 && redirects < 5) {
          res.resume();
          requestInsecure(new URL(loc, url).href, headers, timeoutMs, redirects + 1).then(resolve, reject);
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const etag = String(res.headers.etag || '');
          const lastModified = String(res.headers['last-modified'] || '');
          if (res.statusCode === 304) {
            resolve({ ok: true, notModified: true, status: 304, body: '', contentType: '', url, etag, lastModified });
            return;
          }
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            notModified: false,
            status: res.statusCode || 0,
            body,
            contentType: res.headers['content-type'] || '',
            url,
            etag,
            lastModified,
          });
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

async function request(url, headers = {}, timeoutMs = FEED_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { ...REQ_HEADERS, ...headers },
    });
    const etag = res.headers.get('etag') || '';
    const lastModified = res.headers.get('last-modified') || '';
    if (res.status === 304) {
      return { ok: true, notModified: true, status: 304, body: '', contentType: '', url: res.url || url, etag, lastModified };
    }
    const body = await res.text();
    return {
      ok: res.ok,
      notModified: false,
      status: res.status,
      body,
      contentType: res.headers.get('content-type') || '',
      url: res.url || url,
      etag,
      lastModified,
    };
  } finally {
    clearTimeout(t);
  }
}

function isTimeout(err) {
  const name = err?.name || '';
  const msg = `${name} ${err?.message || ''} ${err?.cause?.code || ''}`;
  return name === 'AbortError' || name === 'TimeoutError' || /AbortError|TimeoutError|aborted|timeout|UND_ERR_CONNECT_TIMEOUT/i.test(msg);
}

async function requestRetry(url, headers = {}, timeoutMs = FEED_TIMEOUT_MS) {
  try {
    const r = await request(url, headers, timeoutMs);
    if (r.ok) return r;
    if (r.status >= 500 || r.status === 429 || r.status === 408) {
      await new Promise((x) => setTimeout(x, 800));
      return await request(url, headers, timeoutMs);
    }
    return r;
  } catch (err) {
    if (isTimeout(err)) return failResult(url, 'timeout');
    if (isCertError(err)) {
      try {
        return await requestInsecure(url, headers, timeoutMs);
      } catch (errCert) {
        return failResult(url, errCert.message || 'tls failed');
      }
    }
    return failResult(url, err.message || 'fetch failed');
  }
}

function absUrl(base, href) {
  try {
    return new URL(href, base).href;
  } catch {
    return '';
  }
}

function discoverFromHtml(html, base) {
  const re = /<link\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const rel = (attr(tag, 'rel') || '').toLowerCase();
    const type = (attr(tag, 'type') || '').toLowerCase();
    const href = attr(tag, 'href');
    if (!href) continue;
    if (rel.includes('alternate') && /rss|atom|xml/.test(type)) {
      return absUrl(base, href);
    }
  }
  return '';
}

function usableFeed(res) {
  if (!res || !res.ok || res.notModified) return false;
  return looksLikeFeed(res.body, res.contentType) || looksLikeSearch(res.body);
}

async function resolveRss(source) {
  if (source.rss) return source.rss;
  const home = await requestRetry(source.url, {}, PROBE_TIMEOUT_MS);
  if (!home.ok && !home.status) return '';
  if (home.ok && home.body) {
    const fromHtml = discoverFromHtml(home.body, home.url || source.url);
    if (fromHtml) {
      const feed = await requestRetry(fromHtml, {}, PROBE_TIMEOUT_MS);
      if (usableFeed(feed)) return fromHtml;
    }
  }
  if (!home.ok) return '';
  const origin = (() => {
    try {
      return new URL(source.url).origin + '/';
    } catch {
      return source.url.endsWith('/') ? source.url : source.url + '/';
    }
  })();
  for (const suffix of FEED_SUFFIXES) {
    const guess = absUrl(origin, suffix);
    if (!guess) continue;
    const feed = await requestRetry(guess, {}, PROBE_TIMEOUT_MS);
    if (usableFeed(feed)) return guess;
  }
  return '';
}

function backoffMs(failSince) {
  const age = Date.now() - Date.parse(failSince);
  if (!Number.isFinite(age) || age < 10 * DAY_MS) return DAY_MS;
  if (age < 30 * DAY_MS) return 5 * DAY_MS;
  if (age < 60 * DAY_MS) return 10 * DAY_MS;
  return 15 * DAY_MS;
}

function shouldSkip(prevSite) {
  if (!prevSite?.fail_since || !prevSite.next_probe) return false;
  const next = Date.parse(prevSite.next_probe);
  return Number.isFinite(next) && Date.now() < next;
}

function postsFor(prev, name) {
  return (prev.posts || [])
    .filter((p) => p && p.author === name && p.published && p.published >= SINCE && p.published <= UNTIL)
    .slice(0, PER_FEED);
}

function condHeaders(prevSite, rss) {
  if (!prevSite || prevSite.rss !== rss) return {};
  const headers = {};
  if (prevSite.etag) headers['If-None-Match'] = prevSite.etag;
  if (prevSite.last_modified) headers['If-Modified-Since'] = prevSite.last_modified;
  return headers;
}

function rememberValidators(site, prevSite, res) {
  const etag = res?.etag || prevSite?.etag || '';
  const lastModified = res?.lastModified || prevSite?.last_modified || '';
  if (etag) site.etag = etag;
  if (lastModified) site.last_modified = lastModified;
  return site;
}

function doneOk(source, rss, posts, res, prevSite) {
  const kept = posts.slice().sort((a, b) => (b.published || '').localeCompare(a.published || '')).slice(0, PER_FEED);
  return rememberValidators({
    name: source.name,
    url: source.url,
    rss,
    group: source.group,
    ok: true,
    error: '',
    count: kept.length,
    posts: kept,
  }, prevSite, res);
}

function failureKind(res) {
  if (!res) return 'no rss';
  if (res.error === 'timeout') return 'timeout';
  if (res.status >= 400) return `http ${res.status}`;
  if (res.error) return res.error;
  return 'no rss';
}

function backsOff(error) {
  return error === 'timeout' || error === 'no rss' || error === 'tls failed';
}

function doneFail(source, prevSite, posts, rss, error) {
  const site = {
    name: source.name,
    url: source.url,
    rss: rss || prevSite?.rss || source.rss || '',
    group: source.group,
    ok: false,
    error,
    count: posts.length,
    posts,
  };
  if (backsOff(error)) {
    const failSince = prevSite?.error === error && prevSite?.fail_since
      ? prevSite.fail_since
      : new Date().toISOString();
    site.fail_since = failSince;
    site.next_probe = new Date(Date.now() + backoffMs(failSince)).toISOString();
  }
  return rememberValidators(site, prevSite, null);
}

function reportFailure(source, prevSite, prevPosts, rss, error) {
  if (error === 'no rss') console.log(`  miss  ${source.name}`);
  else console.log(`  fail  ${source.name}  ${error}`);
  return doneFail(source, prevSite, prevPosts, rss, error);
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

function githubLogin(item) {
  if (item.github) return String(item.github).trim();
  try {
    const host = new URL(item.url).hostname;
    if (host.endsWith('.github.io')) return host.slice(0, -'.github.io'.length);
  } catch {
    /* ignore */
  }
  return '';
}

function fileSlug(name) {
  if (SLUG_OVERRIDE[name]) return SLUG_OVERRIDE[name];
  const s = String(name)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s) return s.slice(0, 48);
  return 'u-' + createHash('sha1').update(String(name)).digest('hex').slice(0, 8);
}

function sniffImage(buf) {
  if (!buf || buf.length < 12) return '';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  if (buf.slice(0, 3).toString() === 'GIF') return 'gif';
  if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00) return 'ico';
  const head = buf.slice(0, 200).toString('utf8').trim().toLowerCase();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return 'svg';
  return '';
}

function hasSips() {
  try {
    execFileSync('sips', ['-h'], { stdio: 'ignore' });
    return true;
  } catch (err) {
    return Boolean(err && err.status);
  }
}

const SIPS = hasSips();

function requestBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (err) {
      reject(err);
      return;
    }
    const lib = parsed.protocol === 'http:' ? http : https;
    const req = lib.get(
      url,
      {
        headers: { 'User-Agent': UA, Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8' },
        timeout: 20000,
        rejectUnauthorized: false,
      },
      (res) => {
        const loc = res.headers.location;
        if (loc && res.statusCode >= 300 && res.statusCode < 400 && redirects < 5) {
          res.resume();
          requestBuffer(new URL(loc, url).href, redirects + 1).then(resolve, reject);
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (!(res.statusCode >= 200 && res.statusCode < 300)) {
            reject(new Error(`status ${res.statusCode || 0}`));
            return;
          }
          resolve({ buf, type: String(res.headers['content-type'] || ''), url });
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function avatarPenalty(url) {
  const u = url.toLowerCase();
  let score = 0;
  if (/banner|cover|preview|og-default|advert|recruitment|loading\.|friend_404|beian|备案|book\.png/.test(u)) score -= 80;
  if (/\/logo|logo\.|cactus|favicon\.svg/.test(u)) score -= 50;
  if (/gravatar\.com|qlogo\.cn/.test(u)) score -= 25;
  return score;
}

function candidatesFromHtml(html, base) {
  const found = [];
  const imgRe = /<img\b[^>]*>/gi;
  let m;
  while ((m = imgRe.exec(html))) {
    const tag = m[0];
    const src = attr(tag, 'src') || attr(tag, 'data-src') || attr(tag, 'data-original');
    if (!src || src.startsWith('data:')) continue;
    const hint = `${attr(tag, 'class')} ${attr(tag, 'id')} ${attr(tag, 'alt')}`.toLowerCase();
    let score = 0;
    if (/avatar|头像|portrait|profile-avatar|profile_avatar|author-avatar/.test(hint)) score += 100;
    if (/logo/.test(hint) && score < 80) score -= 40;
    if (score <= 0) continue;
    const url = absUrl(base, src);
    if (url && /^https?:/i.test(url)) found.push({ url, score: score + avatarPenalty(url), why: 'img' });
  }
  const tagRe = /<[^>]+>/g;
  while ((m = tagRe.exec(html))) {
    const tag = m[0];
    if (!/avatar|头像|author_image|profile-avatar/i.test(tag)) continue;
    const um = tag.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
    if (!um) continue;
    const url = absUrl(base, um[1].trim());
    if (url && /^https?:/i.test(url)) found.push({ url, score: 100 + avatarPenalty(url), why: 'bg' });
  }
  const linkRe = /<link\b[^>]*>/gi;
  while ((m = linkRe.exec(html))) {
    const tag = m[0];
    const rel = (attr(tag, 'rel') || '').toLowerCase();
    const href = attr(tag, 'href');
    if (!href) continue;
    const url = absUrl(base, href);
    if (!url || !/^https?:/i.test(url)) continue;
    if (rel.includes('apple-touch-icon')) {
      found.push({ url, score: 36 + avatarPenalty(url), why: 'apple' });
    } else if (/(^|\s)icon(\s|$)/.test(rel) && !rel.includes('mask-icon')) {
      const sizes = parseInt(attr(tag, 'sizes') || '', 10) || 0;
      let score = sizes >= 96 ? 28 : 18;
      if (/\.ico(\?|$)/i.test(url)) score = 8;
      if (/\.svg(\?|$)/i.test(url)) score = 12;
      found.push({ url, score: score + avatarPenalty(url), why: 'icon' });
    }
  }
  found.sort((a, b) => b.score - a.score);
  const seen = new Set();
  return found.filter((c) => {
    if (c.score < 8 || seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}

async function loadImage(url) {
  try {
    const res = await requestBuffer(url);
    if (!res.buf || res.buf.length < 64 || res.buf.length > 2_500_000) return null;
    const kind = sniffImage(res.buf);
    if (!kind || kind === 'svg') return null;
    return { buf: res.buf, kind, url };
  } catch {
    return null;
  }
}

function writeAvatarFile(buf, kind, slug) {
  mkdirSync(AVATAR_DIR, { recursive: true });
  const pngName = `${slug}.png`;
  const pngPath = resolve(AVATAR_DIR, pngName);
  if (SIPS && kind !== 'svg') {
    const tmp = resolve(tmpdir(), `circle-av-${slug}-${process.pid}.${kind === 'jpg' ? 'jpg' : kind}`);
    writeFileSync(tmp, buf);
    try {
      execFileSync('sips', ['-s', 'format', 'png', '-Z', '192', tmp, '--out', pngPath], { stdio: 'ignore' });
      if (existsSync(pngPath) && statSync(pngPath).size > 80 && sniffImage(readFileSync(pngPath)) === 'png') {
        return `/circle/avatars/${pngName}`;
      }
    } catch {
      /* fall through to the original bytes */
    } finally {
      try {
        unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    }
  }
  const ext = kind === 'jpg' ? 'jpg' : kind;
  const name = `${slug}.${ext}`;
  writeFileSync(resolve(AVATAR_DIR, name), buf);
  return `/circle/avatars/${name}`;
}

function existingAvatar(slug) {
  for (const ext of ['png', 'jpg', 'jpeg', 'webp', 'gif']) {
    const name = `${slug}.${ext}`;
    const p = resolve(AVATAR_DIR, name);
    if (existsSync(p) && statSync(p).size > 80) return `/circle/avatars/${name}`;
  }
  return '';
}

function normName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '');
}

function namesAlign(a, b) {
  const x = normName(a);
  const y = normName(b);
  if (x.length < 6 || y.length < 6) return false;
  return x.includes(y) || y.includes(x);
}

function sameHost(blog, siteUrl) {
  if (!blog || !siteUrl) return false;
  try {
    const raw = /^https?:/i.test(blog) ? blog : `https://${blog}`;
    const a = new URL(raw).hostname.replace(/^www\./, '');
    const b = new URL(siteUrl).hostname.replace(/^www\./, '');
    return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
  } catch {
    return false;
  }
}

function githubLoginsFrom(text) {
  const out = [];
  const re = /https?:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\b/g;
  let m;
  while ((m = re.exec(String(text || '')))) {
    const login = m[1];
    if (/^(github|features|topics|settings|marketplace|collections|explore|orgs|sponsors)$/i.test(login)) continue;
    out.push(login);
  }
  return out;
}

function pageTitle(html) {
  const m = String(html || '').match(/<title[^>]*>([^<]{1,80})<\/title>/i);
  return m ? decodeEntities(m[1]).trim() : '';
}

async function githubJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function githubProfile(login) {
  const data = await githubJson(`https://api.github.com/users/${encodeURIComponent(login)}`);
  if (data?.login && data.type !== 'Organization') return data;
  try {
    const res = await fetch(`https://github.com/${encodeURIComponent(login)}`, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    const title = (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || '';
    if (!title.includes('· GitHub')) return null;
    const named = (html.match(/itemprop="name"[^>]*>\s*([^<]+?)\s*</) || [])[1] || '';
    const paren = (title.match(/\(([^)]+)\)\s*·\s*GitHub/) || [])[1] || '';
    const blog = (html.match(/href="(https?:\/\/[^"]+)" rel="nofollow me"/) || [])[1] || '';
    return { login, name: (named || paren).trim(), blog, type: 'User' };
  } catch {
    return null;
  }
}

function profileMatches(user, source, title) {
  if (!user) return false;
  if (sameHost(user.blog, source.url)) return true;
  if (user.name && [source.name, title].some((label) => namesAlign(label, user.name))) return true;
  const login = normName(user.login);
  const own = normName(source.name);
  return login.length >= 4 && login === own;
}

async function findGithub(source, homeHtml) {
  if (source.github) {
    const known = await githubProfile(source.github);
    if (known) return known.login;
    return source.github;
  }
  const title = pageTitle(homeHtml);
  const logins = [];
  let host = '';
  try {
    host = new URL(source.url).hostname.replace(/^www\./, '');
  } catch {
    /* ignore */
  }
  const stripped = String(title || '').replace(/(?:house|blog|的博客|小窝)$/i, '').trim();
  for (const q of [stripped, host, source.name].filter((q) => q && normName(q).length >= 4)) {
    const data = await githubJson(
      `https://api.github.com/search/users?q=${encodeURIComponent(q)}&per_page=5`,
    );
    for (const item of data?.items || []) {
      if (item?.login) logins.push(item.login);
    }
  }
  logins.push(...githubLoginsFrom(homeHtml));
  const early = await matchLogins(logins, source, title);
  if (early) return early;
  if (source.rss) {
    try {
      const feed = await requestRetry(source.rss);
      if (feed.ok && feed.body) {
        const fromFeed = await matchLogins(githubLoginsFrom(feed.body), source, title);
        if (fromFeed) return fromFeed;
      }
    } catch {
      /* feed is only a hint */
    }
  }
  return '';
}

async function matchLogins(logins, source, title) {
  const seen = new Set();
  for (const login of logins) {
    const key = login.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (seen.size > 24) break;
    const user = await githubProfile(login);
    if (profileMatches(user, source, title)) return user.login;
  }
  return '';
}

async function takeImage(opt) {
  if (!opt) return null;
  if (opt.buf) return { image: { buf: opt.buf, kind: opt.kind }, why: opt.why, from: opt.url };
  const image = await loadImage(opt.url);
  if (!image) return null;
  return { image, why: opt.why, from: opt.url };
}

function isBannerUrl(url) {
  return /banner|cover|preview|og-default|advert|recruitment/i.test(String(url || ''));
}

async function discoverAvatar(source) {
  const portraits = [];
  const weak = [];
  if (source.pinnedAvatar && !isBannerUrl(source.pinnedAvatar)) {
    portraits.push({ url: source.pinnedAvatar, score: 200, why: 'pinned' });
  }
  if (source.localAvatar) {
    const local = resolve(ROOT, 'static', source.localAvatar.replace(/^\//, ''));
    if (existsSync(local)) {
      const buf = readFileSync(local);
      const kind = sniffImage(buf);
      if (kind && kind !== 'svg') portraits.push({ buf, kind, score: 180, why: 'friend', url: source.localAvatar });
    }
  }
  let homeHtml = '';
  if (source.url && !source.localAvatar) {
    try {
      const home = await requestRetry(source.url);
      if (home.ok && home.body) {
        homeHtml = home.body;
        for (const c of candidatesFromHtml(home.body, home.url || source.url)) {
          if (c.score >= 50 && !isBannerUrl(c.url)) portraits.push(c);
          else if (!isBannerUrl(c.url)) weak.push(c);
        }
      }
    } catch {
      /* homepage unavailable */
    }
  }
  portraits.sort((a, b) => b.score - a.score);
  for (const opt of portraits) {
    const hit = await takeImage(opt);
    if (hit) return hit;
  }
  if (!source.localAvatar) {
    const login = await findGithub(source, homeHtml);
    if (login) {
      const hit = await takeImage({
        url: `https://github.com/${login}.png?size=200`,
        why: 'github',
      });
      if (hit) return hit;
    }
  }
  weak.sort((a, b) => b.score - a.score);
  for (const opt of weak) {
    const hit = await takeImage(opt);
    if (hit) return hit;
  }
  if (source.pinnedAvatar) {
    return takeImage({ url: source.pinnedAvatar, why: 'pinned' });
  }
  return null;
}

async function ensureAvatars(sources) {
  mkdirSync(AVATAR_DIR, { recursive: true });
  const map = {};
  async function one(source) {
    const slug = fileSlug(source.name);
    let publicPath = REFRESH_AVATARS ? '' : existingAvatar(slug);
    let why = publicPath ? 'cached' : '';
    if (!publicPath) {
      const found = await discoverAvatar(source);
      if (found) {
        publicPath = writeAvatarFile(found.image.buf, found.image.kind, slug);
        why = found.why;
        console.log(`  avatar ${source.name}  ${why}  ${found.from}`);
      } else {
        console.log(`  avatar ${source.name}  miss`);
      }
    }
    source.avatar = publicPath || '';
    if (!publicPath) return;
    map[source.name] = publicPath;
    try {
      const host = new URL(source.url).hostname;
      if (host) {
        map[host] = publicPath;
        const bare = host.replace(/^www\./, '');
        map[bare] = publicPath;
        if (bare !== host) map[`www.${bare}`] = publicPath;
      }
    } catch {
      /* ignore */
    }
  }
  await pool(sources, CONCURRENCY, one);
  const ordered = {};
  for (const key of Object.keys(map).sort((a, b) => a.localeCompare(b))) ordered[key] = map[key];
  writeFileSync(AVATAR_MAP, JSON.stringify(ordered, null, 2) + '\n');
  const ready = sources.filter((s) => s.avatar).length;
  console.log(`circle avatars: ${ready}/${sources.length} → ${AVATAR_DIR}`);
}

function collectSources() {
  const feeds = loadToml('data/feeds.toml');
  const sources = [];
  for (const item of feeds) {
    if (item._table !== 'feed') continue;
    if (!item.name || !(item.rss || item.url)) continue;
    const avatarRaw = typeof item.avatar === 'string' ? item.avatar : '';
    sources.push({
      name: item.name,
      url: item.url || '',
      github: githubLogin(item),
      localAvatar: avatarRaw.startsWith('/') ? avatarRaw : '',
      pinnedAvatar: /^https?:\/\//i.test(avatarRaw) ? avatarRaw : '',
      avatar: '',
      rss: item.rss || '',
      group: '',
    });
  }
  const seen = new Set();
  return sources.filter((s) => {
    const key = s.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  const prev = loadPrev();
  const prevByName = new Map();
  for (const site of prev.sites || []) {
    if (site?.name) prevByName.set(site.name, site);
  }
  const sources = collectSources();
  await ensureAvatars(sources);
  if (process.argv.includes('--avatars-only')) return;
  console.log(`circle: ${sources.length} sources since ${SINCE.slice(0, 10)}`);

  async function scrapeSite(source) {
    const pages = [source.url];
    try {
      pages.push(new URL('archives/', source.url).href);
      pages.push(new URL('archives.html', source.url).href);
    } catch {
      /* ignore */
    }
    let posts = [];
    let used = '';
    for (const page of pages) {
      const res = await requestRetry(page, {}, PROBE_TIMEOUT_MS);
      if (!res.ok || !res.body) continue;
      const got = scrapeHtml(res.body, source);
      if (got.length > posts.length) {
        posts = got;
        used = page;
      }
      if (posts.length >= PER_FEED) break;
    }
    const recent = posts.filter((p) => p.published && p.published >= SINCE && p.published <= UNTIL);
    recent.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
    if (!posts.length) return null;
    return { posts: recent.slice(0, PER_FEED), used: used || pages[0], found: posts.length };
  }

  function fromBody(source, rss, res, prevSite, prevPosts) {
    if (!res) return null;
    if (res.notModified) {
      console.log(`  ok    ${source.name}  ${prevPosts.length}  ${rss} (304)`);
      return doneOk(source, rss, prevPosts, res, prevSite);
    }
    if (res.ok && looksLikeFeed(res.body, res.contentType)) {
      const posts = parseFeed(res.body, { ...source, rss });
      console.log(`  ok    ${source.name}  ${posts.length}  ${rss}`);
      return doneOk(source, rss, posts, res, prevSite);
    }
    if (res.ok && looksLikeSearch(res.body)) {
      const posts = parseSearchXml(res.body, { ...source, rss });
      console.log(`  ok    ${source.name}  ${posts.length}  ${rss} (search.xml)`);
      return doneOk(source, rss, posts, res, prevSite);
    }
    if (res.ok && res.body) {
      const posts = scrapeHtml(res.body, source)
        .filter((p) => p.published && p.published >= SINCE && p.published <= UNTIL)
        .slice(0, PER_FEED);
      if (posts.length) {
        console.log(`  ok    ${source.name}  ${posts.length}  ${res.url || rss} (html)`);
        return doneOk(source, res.url || rss, posts, res, prevSite);
      }
    }
    return null;
  }

  async function fetchOne(source, prevSite, prevPosts) {
    if (shouldSkip(prevSite)) {
      console.log(`  skip  ${source.name}  until ${String(prevSite.next_probe).slice(0, 10)}`);
      const site = doneFail(source, prevSite, prevPosts, prevSite.rss || source.rss || '', prevSite.error || 'cached');
      site.fail_since = prevSite.fail_since;
      site.next_probe = prevSite.next_probe;
      site.skipped = true;
      return site;
    }

    const known = source.rss || prevSite?.rss || '';
    if (known) {
      const res = await requestRetry(known, condHeaders(prevSite, known), FEED_TIMEOUT_MS);
      const hit = fromBody(source, known, res, prevSite, prevPosts);
      if (hit) return hit;
      const kind = failureKind(res);
      if (kind === 'timeout' || kind === 'tls failed') {
        return reportFailure(source, prevSite, prevPosts, known, kind);
      }
      if (source.rss) {
        const scraped = await scrapeSite(source);
        if (scraped) {
          console.log(`  ok    ${source.name}  ${scraped.posts.length}  ${scraped.used} (html)`);
          return doneOk(source, scraped.used, scraped.posts, null, prevSite);
        }
        return reportFailure(source, prevSite, prevPosts, known, kind);
      }
      if (/^http 5/.test(kind) || kind === 'http 408' || kind === 'http 429') {
        return reportFailure(source, prevSite, prevPosts, known, kind);
      }
    }

    const discovered = await resolveRss({ ...source, rss: '' });
    if (discovered && discovered !== known) {
      const res = await requestRetry(discovered, {}, FEED_TIMEOUT_MS);
      const hit = fromBody(source, discovered, res, prevSite, prevPosts);
      if (hit) return hit;
      const kind = failureKind(res);
      if (kind !== 'no rss') return reportFailure(source, prevSite, prevPosts, discovered, kind);
    }
    const scraped = await scrapeSite(source);
    if (scraped) {
      console.log(`  ok    ${source.name}  ${scraped.posts.length}  ${scraped.used} (html)`);
      return doneOk(source, scraped.used, scraped.posts, null, prevSite);
    }
    return reportFailure(source, prevSite, prevPosts, known, 'no rss');
  }

  const sites = await pool(sources, CONCURRENCY, async (source) => {
    const prevSite = prevByName.get(source.name);
    const prevPosts = postsFor(prev, source.name);
    try {
      return await fetchOne(source, prevSite, prevPosts);
    } catch (err) {
      console.log(`  fail  ${source.name}  ${err.message}`);
      return doneFail(source, prevSite, prevPosts, source.rss || prevSite?.rss || '', err.message || 'fetch failed');
    }
  });

  const posts = [];
  for (const site of sites) {
    for (const p of site.posts || []) posts.push(p);
    delete site.posts;
    delete site.skipped;
  }
  posts.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
  if (posts.length > MAX_POSTS) posts.length = MAX_POSTS;

  const payload = {
    updated_at: new Date().toISOString(),
    posts,
    sites,
  };
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
  const ok = sites.filter((s) => s.ok).length;
  console.log(`circle: wrote ${posts.length} posts from ${ok}/${sites.length} feeds → ${OUT}`);
}

function checkBackoff() {
  const now = Date.now();
  const samples = [
    [new Date(now - 1000).toISOString(), DAY_MS],
    [new Date(now - 12 * DAY_MS).toISOString(), 5 * DAY_MS],
    [new Date(now - 40 * DAY_MS).toISOString(), 10 * DAY_MS],
    [new Date(now - 70 * DAY_MS).toISOString(), 15 * DAY_MS],
  ];
  for (const [since, want] of samples) {
    const got = backoffMs(since);
    if (got !== want) {
      console.error(`backoff ${since} got ${got} want ${want}`);
      return 1;
    }
  }
  const future = new Date(now + DAY_MS).toISOString();
  if (!shouldSkip({ fail_since: new Date(now).toISOString(), next_probe: future })) return 1;
  if (shouldSkip({ fail_since: new Date(now - DAY_MS).toISOString(), next_probe: new Date(now - 1000).toISOString() })) return 1;
  if (failureKind({ error: 'timeout', status: 0 }) !== 'timeout') return 1;
  if (failureKind({ ok: false, status: 502 }) !== 'http 502') return 1;
  if (failureKind({ ok: false, status: 401 }) !== 'http 401') return 1;
  if (failureKind({ ok: true, status: 200 }) !== 'no rss') return 1;
  if (backsOff('http 502') || backsOff('http 401')) return 1;
  if (!backsOff('no rss') || !backsOff('timeout') || !backsOff('tls failed')) return 1;
  console.log('backoff ok');
  return 0;
}

if (process.argv.includes('--check-backoff')) {
  process.exit(checkBackoff());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
