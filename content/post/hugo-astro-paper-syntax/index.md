---
title: astro-paper 主题特色语法速查
slug: hugo-astro-paper-syntax
description:
date: 2026-11-20T11:00:00+08:00
lastmod: 2026-11-20T11:30:00+08:00
featured: false
draft: false
tags:
  - 主题
  - Hugo
---

每条格式：**引用块里是写法**（照着抄），**下面不引用的是实际渲染效果**。这篇文章自己就用了文中的目录、代码块和 Callout 语法。

## Callout 提示块

### 基本形式

> 写法：一行 `> [!类型]` 开头，下面每行都带 `>`：
>
> ````md
> > [!tip] 这是一个提示
> > 提示内容写在这里，可以多行。
> ````

实际渲染：

> [!tip] 这是一个提示
> 提示内容写在这里，可以多行。

### 全部类型

> 写法：把类型换掉即可，标题可写可不写（不写就显示类型名）：
>
> ````md
> > [!note] 笔记
> > [!info] 信息
> > [!todo] 待办
> ````

实际渲染（一批）：

> [!note]
> 默认的蓝色笔记块。

> [!info] 信息
> `info` 和 `note` 是近亲，浅蓝色。

> [!todo] 待办
> 用来标记要做的事。

> [!success] 成功
> 绿色，表示完成或正确。

> [!question] 疑问
> 黄色，提出问题。

> [!warning] 警告
> 橙色，需要注意。

> [!danger] 危险
> 红色，高风险操作。

> [!bug] Bug
> 记录问题复现。

> [!example] 示例
> 紫色，示例代码或用法。

> [!quote] 引用
> 灰色，引用别人说的话。

> [!abstract] 摘要
> 青色，也可以写 `summary` / `tldr`。

### 别名

> 写法：部分类型有别名，效果一样：`hint`/`important` → tip、`check`/`done` → success、`help`/`faq` → question、`caution`/`attention` → warning、`error` → danger、`cite` → quote、`fail`/`missing` → failure。
>
> ````md
> > [!hint] 别名演示
> > 这其实是一个 tip。
> ````

实际渲染：

> [!hint] 别名演示
> 这其实是一个 tip。

### 可折叠

> 写法：类型后面加 `-` 默认收起、加 `+` 默认展开，点标题折叠：
>
> ````md
> > [!warning]- 默认收起的警告
> > 点标题展开我。
>
> > [!info]+ 默认展开的信息
> > 点标题收起我。
> ````

实际渲染（点一下试试）：

> [!warning]- 默认收起的警告
> 点标题展开我。

> [!info]+ 默认展开的信息
> 点标题收起我。

### 内容里可以写 Markdown

> 写法：提示块内部照常支持加粗、链接、列表、代码等：
>
> ````md
> > [!example] 语法演示
> > 行内 **加粗**、`code`、[链接](/p/hugo-astro-paper-syntax/) 都行。
> >
> > - 列表项一
> > - 列表项二
> ````

实际渲染：

> [!example] 语法演示
> 行内 **加粗**、`code`、[链接](/p/hugo-astro-paper-syntax/) 都行。
>
> - 列表项一
> - 列表项二

> [!quote] 普通引用不受影响
> 不带 `[!类型]` 开头的引用块还是原来的引用样式，旧文章的引用都不用改。

## 代码块文件名徽章

> 写法：语言后面跟 `{file="文件名"}`（注意要花括号）：
>
> ````md
> ```js {file="app.js"}
> const a = 1;
> ```
> ````

实际渲染（块上方有带绿点的文件名标签）：

```js {file="app.js"}
const a = 1;
```

## 代码块行标记

> 写法：行尾加 `// [!code ++]` 标新增、`// [!code --]` 标删除、`// [!code highlight]` 高亮该行：
>
> ````md
> ```js
> const kept = "原样";
> const added = "新增的行"; // [!code ++]
> const removed = "删除的行"; // [!code --]
> const focused = "高亮的行"; // [!code highlight]
> ```
> ````

实际渲染（绿底 `+` 为新增，红底 `-` 为删除，灰底为高亮）：

```js
const kept = "原样";
const added = "新增的行"; // [!code ++]
const removed = "删除的行"; // [!code --]
const focused = "高亮的行"; // [!code highlight]
```

> 写法：整行注释形式一次标记接下来 N 行（`[!code --:3]` 表示后面 3 行）：
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

实际渲染（标记行本身不显示，后面 3 行整体删除态）：

```css
/* [!code --:3] */
.old-a { color: red; }
.old-b { color: red; }
.old-c { color: red; }
.new-a { color: green; }
```

## frontmatter 特殊字段

> 写法（都是可选字段）：
>
> ````yaml
> ---
> title: "文章标题"
> featured: true    # 出现在首页「Featured」区块
> lastmod: 2026-11-20T11:30:00+08:00   # 晚于 date 时，日期行显示 "Updated:"
> hideToc: true      # 本文不显示目录（默认自动生成）
> slug: "自定义url"   # /p/<slug>/
> draft: true        # 草稿，构建时不发布
> ---
> ````

实际效果：首页 Featured 区块现在放的是 PlanningToDo；带 `lastmod` 的文章日期行会出现 "Updated:"（本文就有）；`hideToc: true` 单篇关闭自动目录。

## 自动行为（无需写法）

> [!info] 自动目录
> 文章有标题就在标题下方生成缩进目录，点击跳转；`hideToc: true` 可单篇关闭。本文顶部就有一份。

> [!info] 页面切换动画
> 全站自动启用 View Transitions：首页点标题进来时标题会「飞」过来，导航栏宽度也会平滑拉宽到文章列——离开文章又缩回去。纯 CSS 实现，无需写任何东西。

> [!info] 全局搜索（⌘K）
> 点导航栏搜索图标或按 `Cmd+K` / `Ctrl+K`，输入即搜全文；索引由部署流程自动生成。

> [!info] 标签聚合页
> frontmatter 的 `tags` 每一项自动生成 `/tags/<标签>/` 聚合页（文章多时自动分页）；导航「Tags」页可看全部标签。RSS 在 `/rss.xml`（首页标题旁的图标即入口）。
