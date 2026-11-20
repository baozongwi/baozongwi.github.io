# AstroPaper for Hugo 📄

A minimal, responsive, accessible and SEO-friendly blog theme for [Hugo](https://gohugo.io/) — a faithful port of Sat Naing's [AstroPaper](https://github.com/satnaing/astro-paper) theme.

> Original theme: [astro-paper.pages.dev](https://astro-paper.pages.dev/)

## ✨ Features

- responsive (mobile → desktop)
- light & dark mode (system-aware, FOUC-free); dark mode swaps every
  formerly-orange element for Cactus-style green, backgrounds untouched
- opt-in first-visit welcome splash (ported from the author's flavor theme)
- compact code blocks (11px mono) that never overflow the page width
- post titles in the flavor style (35px, bold, tight tracking)
- inline table of contents under the post title (flavor style), plus a
  back-to-top button with a reading-progress ring
- **page transitions** — cross-document view transitions with shared-element
  morphs (post titles and tags animate between pages, like Astro's
  ClientRouter; Chromium 126+ / Safari 18.2+, graceful fallback elsewhere)
- accessible (keyboard, skip links, focus rings, aria)
- SEO-friendly (meta, Open Graph, JSON-LD, sitemap, canonical)
- static search ([Pagefind](https://pagefind.app/)) via a global overlay
  (nav button or `⌘K`)
- draft posts & pagination
- table of contents beside posts: replaced by the flavor theme's inline
  contents list under the post title (no side drawer, no popover)
- tags, archives, **links page** (friend links on ruled "paper", ported from
  the author's flavor theme), RSS (`/rss.xml`), `robots.txt`
- reading progress, heading anchors, image lightbox
- adjacent-post navigation (post footers keep only the tags)
- i18n ready (`en`, `zh-cn` built in)
- **no Node.js / npm needed at build time** — vanilla CSS & JS, Hugo pipes only

## 🔧 Requirements

- Hugo **≥ 0.146** (extended recommended)
- [Pagefind](https://pagefind.app/) binary — *optional*, only for search indexing
  (`brew install pagefind` / `cargo install pagefind` / download a release)

## 🚀 Quick start

```bash
# 1. add the theme (git submodule or clone)
git submodule add https://github.com/baozongwi/hugo-astro-paper themes/hugo-astro-paper

# 2. copy the example site as a starting point
cp -r themes/hugo-astro-paper/exampleSite/{hugo.toml,content,static} .

# 3. build + search index
hugo                       # or: hugo server
pagefind -site public      # after hugo build, for search
```

## 📁 Project structure of a site

```
/
├── content/
│   ├── posts/            # blog posts (URL /posts/<slug>/)
│   ├── pages/
│   │   ├── _index.md     # headless section container (build: never)
│   │   ├── about.md      # → /about/
│   │   ├── archives.md   # layout: archives → /archives/
│   │   ├── links.md      # layout: links   → /links/
│   │   └── search.md     # layout: search  → /search/
├── data/
│   └── friends.toml     # friend links data (see "Links page" below)
├── static/
│   ├── favicon.svg
│   └── default-og.jpg    # fallback OG image (params.site.ogImage)
└── hugo.toml
```

Posts may be organised into subdirectories — the subdirectory name becomes
part of the post URL (like AstroPaper). The `slug` frontmatter overrides the
filename-based URL, exactly as in the original theme.

> **Nav note** — this port intentionally drops the original "Posts" nav
> button: the header shows Tags / About / Links / Archives / Search / theme
> toggle, and the home page's "All Posts" button points to `/archives/`
> (the posts section list itself is not rendered).

## ⚙️ Configuration

See [`exampleSite/hugo.toml`](exampleSite/hugo.toml) for a full annotated
example. The essential parts:

```toml
baseURL = "https://example.com/"
title = "My Blog"
theme = "hugo-astro-paper"
enableRobotsTXT = true

[pagination]
  pagerSize = 4                 # astro-paper posts.perPage

[permalinks]
  pages = "/:slug/"             # about.md → /about/

[outputs]
  home = ["HTML", "RSS"]        # site-wide feed at /rss.xml
  section = ["HTML"]
  taxonomy = ["HTML"]
  term = ["HTML"]

[taxonomies]
  tag = "tags"

# NOTE: Hugo does not merge `markup` from theme config — copy this block
[markup]
  [markup.highlight]
    noClasses = false           # theme ships chroma.css (light+dark)
  [markup.tableOfContents]
    startLevel = 2
    endLevel = 3
  [markup.goldmark.renderer]
    unsafe = true               # allow raw HTML in posts

[params]
  description = "…"

  [params.site]                 # astro-paper site config
    author = "Your Name"
    profile = "https://example.com"
    ogImage = "default-og.jpg"
    # googleVerification = "…"

  [params.features]
    lightAndDarkMode = true
    showBackButton = true
    showArchives = true
    toc = true
    search = "pagefind"

  [[params.socials]]            # icons: theme's assets/icons/socials/<name>.svg
    name = "github"
    url = "https://github.com/<user>"
  [[params.socials]]
    name = "mail"
    url = "mailto:you@example.com"
```

### `astro-paper.config.ts` → `hugo.toml` mapping

| AstroPaper                          | Hugo                                            |
| ----------------------------------- | ----------------------------------------------- |
| `site.url`                          | `baseURL`                                       |
| `site.title` / `site.description`   | `title` / `params.description`                  |
| `site.author` / `site.profile`      | `params.site.author` / `params.site.profile`    |
| `site.ogImage`                     | `params.site.ogImage`                           |
| `site.googleVerification`           | `params.site.googleVerification`               |
| `site.lang` / `site.dir`            | `defaultContentLanguage` / `params.site.dir`   |
| `posts.perPage` / `posts.perIndex`  | `pagination.pagerSize` / `params.posts.perIndex`|
| `features.*`                        | `params.features.*`                             |
| `socials`                            | `params.socials`                                |
| *(flavor)* welcome splash           | `params.welcome.enabled` / `.text`              |

## 📝 Posts

Create with `hugo new posts/my-post.md`. Frontmatter mapping:

| AstroPaper                          | Hugo                                            |
| ----------------------------------- | ----------------------------------------------- |
| `pubDatetime`                        | `date`                                          |
| `modDatetime`                        | `lastmod`                                       |
| `title`, `slug`, `tags`, `description` | same                                           |
| `featured`                           | `featured` (shows in the home Featured section) |
| `draft`                              | `draft`                                         |
| `canonicalURL`                       | `canonicalURL`                                  |
| `author`, `hideToc`                  | same (params)                                   |
| `timezone`                           | not ported (dates are site-wide in Hugo)        |

```yaml
---
title: My Post
description: A short summary.
date: 2026-01-01T09:00:00+08:00
lastmod: 2026-02-01T09:00:00+08:00  # optional → shows "Updated: …"
featured: false
draft: false
tags: [Hugo, Theme]
---
```

## 🔍 Search

A **global search overlay** (ported from the author's flavor theme):
click the nav search icon or press `⌘K` / `Ctrl+K`, type, and results with
highlighted excerpts appear instantly. Pagefind's raw API provides the data;
the index is generated after the Hugo build:

```bash
# from the theme root — builds exampleSite, downloads pagefind if missing,
# indexes, and copies the bundle into exampleSite/static/pagefind/ so that
# `hugo server` has working search too
scripts/search-index.sh
```

For your own site, the same steps are `hugo && pagefind --site public`
(pagefind binary: grab a release — there is no Homebrew formula).
The overlay shows a hint when the index is missing.

## 🔗 Links page

`/links/` renders friend links as handwritten names scattered on ruled
paper (ported from the author's [flavor](https://github.com/baozongwi/flavor)
theme). Data lives in `data/friends.toml`:

```toml
[[Team]]
  name = "su-team"
  url = "https://su-team.cn/"
  description = "…"

[[Links]]
  name = "friend"
  url = "https://friend.example/"
  offline = true            # shown dimmed with a "temporarily unreachable" hint
  description = "…"
```

Groups render in `Team`, `Links` order, then any other top-level keys.
The Caveat font used for the handwriting is bundled with the theme
(`static/fonts/Caveat-latin.woff2`).

## 🎨 Customization

- **Colors** — override the CSS variables in a small custom stylesheet:
  copy `assets/css/main.css` section 1 into your site and set
  `params.customCSS`, or just edit the tokens (`--accent` etc.).
- **Fonts** — self-host "Google Sans Code" (the original theme's font) and
  link it via `params.font.css`; a monospace system stack is the fallback.
- **Custom code** — override these partials in your site:
  `partials/custom/head.html`, `partials/custom/body-end.html`,
  `partials/custom/post-end.html` (e.g. giscus comments).

## 🔍 Differences from the Astro original

The goal was parity in **look, feel and features**, using Hugo-native
mechanisms:

- Tailwind v4 → hand-written vanilla CSS (zero Node dependencies; Hugo pipes only)
- Shiki dual-theme highlighting → Chroma with light/dark CSS (github / onedark)
- Astro's ClientRouter view transitions → CSS cross-document view transitions
  (`@view-transition`), with the same shared-element names on post titles
  and tags (older browsers fall back to normal navigation)
- Dark mode: the original AstroPaper palette with only the formerly-orange
  elements swapped to Cactus-style green (`#2bbc8a` accent, `#14654d`
  border); light mode stays the AstroPaper default
- Code blocks and copy buttons keep the original AstroPaper look with a
  smaller 11px font; post-title typography, the inline TOC, the links page
  and the search overlay are ported from the author's own blog;
  the hero stays the original AstroPaper design
- The "Posts" nav button is dropped in favour of Archives (this port's
  intended customization); posts still live under `/posts/<slug>/`
- Dynamic OG image generation (satori + sharp) → not ported; every page
  shares the site-level og image (`params.site.ogImage`)
- Astro's dedicated `/search` page → a global search overlay (nav button /
  `⌘K`), fed by Pagefind's raw API from the generated `pagefind/` bundle —
  same design as the author's own blog
- Pagination URLs are `/tags/<tag>/page/2/` (Hugo convention) instead of `/tags/<tag>/2/`
- Obsidian callouts / remark-collapse / inline TOC remark plugins → not ported
  (use Hugo render hooks if you need them)

## 🧞 Commands

```bash
hugo server -w                     # dev server
hugo --minify                      # production build
pagefind -site public              # search index (after build)
```

## 📜 License

MIT — same as the original theme. Port credits to
[AstroPaper](https://github.com/satnaing/astro-paper) by
[Sat Naing](https://github.com/satnaing) are appreciated.
