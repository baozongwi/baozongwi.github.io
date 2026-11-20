---
title: "新主题（hugo-astro-paper）专属语法速查"
slug: hugo-astro-paper-syntax
description: "本主题相比旧主题（flavor）新增的写法与功能：代码块文件名徽章、[!code] 行标记、featured 精选、页面切换动画等，每条都是「写法 + 实际渲染」对照，方便日后参考。"
date: 2026-11-20T11:00:00+08:00
lastmod: 2026-11-20T11:30:00+08:00
featured: false
draft: false
tags:
  - 主题
  - Hugo
---

以下每条格式都是：**引用块里是写法**（照着抄），**下面一行不引用的是实际渲染效果**。本篇文章本身就是自演示：frontmatter 里写了 `featured: true`，所以它会出现在首页「精选」区块；写了 `lastmod`，所以日期旁显示 "Updated:"。

## 代码块文件名徽章

> 写法：语言后面跟 `{file="文件名"}`（注意要花括号，这是 Hugo 的属性语法）：
>
> ````md
> ```js {file="app.js"}
> const a = 1;
> ```
> ````

实际渲染（块上方有文件名小标签，带绿点）：

```js {file="app.js"}
const a = 1;
```

## 行级标记：新增 / 删除 / 高亮

> 写法：行尾加 `// [!code ++]` 标记新增、`// [!code --]` 标记删除、`// [!code highlight]` 高亮该行：
>
> ````md
> ```js
> const kept = "原样";
> const added = "新增的行"; // [!code ++]
> const removed = "删除的行"; // [!code --]
> const focused = "高亮的行"; // [!code highlight]
> ```
> ````

实际渲染（绿底 + 号为新增，红底 - 号为删除，灰底为高亮）：

```js
const kept = "原样";
const added = "新增的行"; // [!code ++]
const removed = "删除的行"; // [!code --]
const focused = "高亮的行"; // [!code highlight]
```

> 写法：整行注释形式可以一次标记接下来的 N 行（`[!code ++:3]` 表示后面 3 行都算新增）：
>
> ````md
> ```css
> /* [!code --:3] */
> .old-a { color: red; }
> .old-b { color: red; }
> .old-c { color: red; }
> .new-a { color: green; }
> ```
> ````

实际渲染（标记行本身不显示，后面 3 行整体变删除态）：

```css
/* [!code --:3] */
.old-a { color: red; }
.old-b { color: red; }
.old-c { color: red; }
.new-a { color: green; }
```

## frontmatter 新字段

> 写法（本文就用了前两个，可以直接看首页和本文日期行验证）：
>
> ````yaml
> ---
> title: "文章标题"
> featured: true    # 出现在首页「精选」区块
> lastmod: 2026-11-20T11:30:00+08:00   # 日期行显示 "Updated:"
> hideToc: true      # 本文不显示目录（默认自动生成）
> ogImage: "img/cover.jpg"   # 本篇的分享卡片图（默认用站点 logo）
> slug: "自定义url"   # /p/<slug>/
> draft: true        # 草稿，构建时不发布
> ---
> ````

实际效果：首页「精选」区块里有本文；本文日期行带 "Updated:"；标题下方自动生成了本文目录（因为没写 `hideToc: true`）。

## 自动目录

> 写法：什么都不用写。文章里有标题就自动在标题下方生成缩进目录，点目录跳转到对应章节；`hideToc: true` 可对单篇关闭。

实际效果：见本文标题下方的目录，条目就是下面这些小节的标题。

## 页面切换动画（自动）

> 无需写法：全站自动启用。点文章列表标题进入文章时，标题会「飞」过去衔接；点标签时标签文字会变形过渡到标签页。这是原版 AstroPaper 的 View Transitions，纯 CSS 实现。

实际效果：从首页点本文标题进来时已经体验过一次了。

## 全局搜索（⌘K）

> 无需写法：点导航栏搜索图标、或按 `Cmd+K` / `Ctrl+K` 呼出全屏搜索遮罩，输入即搜全文。索引由部署流程自动生成（CI 已内置该步骤）。

实际效果：现在就按一下 `⌘K` 试试。

## 标签聚合页

> 写法：frontmatter 的 `tags` 列表里的每个标签都会自动生成 `/tags/<标签>/` 聚合页（文章多时自动分页），顶部导航「标签」页可见全部标签。

实际效果：本文底部有「主题」「Hugo」两个标签，点进去就是对应聚合页。

## 其余自动行为

> 归档页 `/archives/` 自动按年份 → 月份分组全部文章；RSS 在 `/rss.xml`（首页标题旁的图标即入口）；导航高亮当前页面；暗色模式下原本橙色的地方全部换成绿色（本主题的定制）。
