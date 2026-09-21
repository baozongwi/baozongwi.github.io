#!/usr/bin/env node
/**
 * Fetch RSS/Atom from friend links + data/feeds.toml and write data/circle.json.
 *
 *   node scripts/fetch-circle.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import http from 'node:http';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'data/circle.json');
const PER_FEED = 8;
const CONCURRENCY = 4;
const TIMEOUT_MS = 60000;
const MAX_POSTS = 240;
const SINCE = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 4);
  return d.toISOString();
})();
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
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inner(xml, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i');
  const m = xml.match(re);
  return m ? decodeEntities(m[1]).trim() : '';
}

function attr(tagXml, name) {
  const m = tagXml.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i'));
  return m ? m[1] : '';
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
    if (!published || published < SINCE) continue;
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
  if (!published || published < SINCE) return null;
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

function requestInsecure(url, redirects = 0) {
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
        headers: REQ_HEADERS,
        timeout: TIMEOUT_MS,
        rejectUnauthorized: false,
      },
      (res) => {
        const loc = res.headers.location;
        if (loc && res.statusCode >= 300 && res.statusCode < 400 && redirects < 5) {
          res.resume();
          requestInsecure(new URL(loc, url).href, redirects + 1).then(resolve, reject);
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode || 0,
            body,
            contentType: res.headers['content-type'] || '',
            url,
          });
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

async function request(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: REQ_HEADERS,
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body, contentType: res.headers.get('content-type') || '', url: res.url || url };
  } finally {
    clearTimeout(t);
  }
}

async function requestRetry(url) {
  try {
    const r = await request(url);
    if (r.ok) return r;
    if (r.status >= 500 || r.status === 429 || r.status === 408) {
      await new Promise((x) => setTimeout(x, 800));
      return await request(url);
    }
    return r;
  } catch (err) {
    if (isCertError(err)) {
      try {
        return await requestInsecure(url);
      } catch (errCert) {
        return { ok: false, status: 0, body: '', contentType: '', url, error: errCert.message || 'tls failed' };
      }
    }
    try {
      await new Promise((x) => setTimeout(x, 800));
      return await request(url);
    } catch (err2) {
      if (isCertError(err2)) {
        try {
          return await requestInsecure(url);
        } catch (errCert) {
          return { ok: false, status: 0, body: '', contentType: '', url, error: errCert.message || 'tls failed' };
        }
      }
      return { ok: false, status: 0, body: '', contentType: '', url, error: err2.message || err.message || 'fetch failed' };
    }
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

async function resolveRss(source, cached) {
  if (source.rss) return source.rss;
  if (cached) {
    const hit = await requestRetry(cached);
    if (hit.ok && (looksLikeFeed(hit.body, hit.contentType) || looksLikeSearch(hit.body))) return cached;
  }
  const home = await requestRetry(source.url);
  if (home.ok) {
    const fromHtml = discoverFromHtml(home.body, home.url || source.url);
    if (fromHtml) {
      const feed = await requestRetry(fromHtml);
      if (feed.ok && (looksLikeFeed(feed.body, feed.contentType) || looksLikeSearch(feed.body))) return fromHtml;
    }
  }
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
    const feed = await requestRetry(guess);
    if (feed.ok && (looksLikeFeed(feed.body, feed.contentType) || looksLikeSearch(feed.body))) return guess;
  }
  return '';
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

function githubAvatar(item) {
  const login = githubLogin(item);
  return login ? `https://github.com/${login}.png?size=80` : '';
}

function collectSources() {
  const friends = loadToml('data/friends.toml');
  const feeds = loadToml('data/feeds.toml');
  const sources = [];
  for (const item of friends) {
    if (!item.name || !item.url) continue;
    if (item.offline || item.circle === false) continue;
    sources.push({
      name: item.name,
      url: item.url,
      github: githubLogin(item),
      avatar: githubAvatar(item),
      rss: item.rss || '',
      group: 'friend',
    });
  }
  for (const item of feeds) {
    if (item._table !== 'feed') continue;
    if (!item.name || !(item.rss || item.url)) continue;
    sources.push({
      name: item.name,
      url: item.url || '',
      github: githubLogin(item),
      avatar: githubAvatar(item),
      rss: item.rss || '',
      group: item.group || 'feed',
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
  const rssCache = {};
  for (const s of prev.sites || []) {
    if (s && s.name && s.rss) rssCache[s.name] = s.rss;
  }
  const sources = collectSources();
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
      const res = await requestRetry(page);
      if (!res.ok || !res.body) continue;
      const got = scrapeHtml(res.body, source);
      if (got.length > posts.length) {
        posts = got;
        used = page;
      }
      if (posts.length >= PER_FEED) break;
    }
    const recent = posts.filter((p) => p.published && p.published >= SINCE);
    recent.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
    if (!posts.length) return null;
    return { posts: recent.slice(0, PER_FEED), used: used || pages[0], found: posts.length };
  }

  async function fetchOne(source, cached) {
    const rss = await resolveRss(source, cached);
    if (rss) {
      const res = await requestRetry(rss);
      if (res.ok && looksLikeFeed(res.body, res.contentType)) {
        const posts = parseFeed(res.body, { ...source, rss });
        console.log(`  ok    ${source.name}  ${posts.length}  ${rss}`);
        return { name: source.name, url: source.url, rss, group: source.group, ok: true, error: '', count: posts.length, posts };
      }
      if (res.ok && looksLikeSearch(res.body)) {
        const posts = parseSearchXml(res.body, { ...source, rss });
        console.log(`  ok    ${source.name}  ${posts.length}  ${rss} (search.xml)`);
        return { name: source.name, url: source.url, rss, group: source.group, ok: true, error: '', count: posts.length, posts };
      }
    }
    const scraped = await scrapeSite(source);
    if (scraped) {
      console.log(`  ok    ${source.name}  ${scraped.posts.length}  ${scraped.used} (html)`);
      return { name: source.name, url: source.url, rss: scraped.used, group: source.group, ok: true, error: '', count: scraped.posts.length, posts: scraped.posts };
    }
    console.log(`  miss  ${source.name}`);
    return { name: source.name, url: source.url, rss: rss || '', group: source.group, ok: false, error: 'no rss', count: 0, posts: [] };
  }

  const sites = await pool(sources, CONCURRENCY, async (source) => {
    try {
      return await fetchOne(source, rssCache[source.name]);
    } catch (err) {
      console.log(`  fail  ${source.name}  ${err.message}`);
      return { name: source.name, url: source.url, rss: source.rss || '', group: source.group, ok: false, error: err.message, count: 0, posts: [] };
    }
  });

  for (let i = 0; i < sites.length; i++) {
    if (sites[i].ok) continue;
    const err = sites[i].error || '';
    if (err === 'no rss') continue;
    const source = sources[i];
    console.log(`  retry ${source.name}`);
    try {
      sites[i] = await fetchOne(source, sites[i].rss || rssCache[source.name]);
    } catch (err) {
      sites[i] = { ...sites[i], error: err.message };
    }
  }

  const posts = [];
  for (const site of sites) {
    for (const p of site.posts || []) posts.push(p);
    delete site.posts;
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
