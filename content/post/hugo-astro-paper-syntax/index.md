---
title: "Callout 提示块写法速查"
slug: hugo-astro-paper-syntax
description: "主题的 Obsidian 风格提示块（[!note] [!tip] [!info] 等）怎么写：引用块里是写法，下面一行是实际渲染效果，照抄即可。"
date: 2026-11-20T11:00:00+08:00
lastmod: 2026-11-20T11:30:00+08:00
featured: false
draft: false
tags:
  - 主题
  - Hugo
---

每条格式：**引用块里是写法**（照着抄），**下面不引用的是实际渲染效果**。

## 基本形式

> 写法：一行 `> [!类型]` 开头，下面每行都带 `>`：
>
> ````md
> > [!tip] 这是一个提示
> > 提示内容写在这里，可以多行。
> ````

实际渲染：

> [!tip] 这是一个提示
> 提示内容写在这里，可以多行。

## 全部类型

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

## 别名

> 写法：部分类型有别名，效果一样：
> `hint` / `important` → tip，`check` / `done` → success，`help` / `faq` → question，`caution` / `attention` → warning，`error` → danger，`cite` → quote，`fail` / `missing` → failure。
>
> ````md
> > [!hint] 别名演示
> > 这其实是一个 tip。
> ````

实际渲染：

> [!hint] 别名演示
> 这其实是一个 tip。

## 可折叠

> 写法：类型后面加 `-` 表示默认收起，加 `+` 表示默认展开（点击标题折叠/展开）：
>
> ````md
> > [!warning]- 默认收起的警告
> > 点标题展开我。
>
> > [!info]+ 默认展开的信息
> > 点标题收起我。
> ````

实际渲染（第一个是收起的，点一下试试）：

> [!warning]- 默认收起的警告
> 点标题展开我。

> [!info]+ 默认展开的信息
> 点标题收起我。

## 内容里可以写 Markdown

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
> 不带 `[!类型]` 开头的引用块还是原来的引用样式，全文的旧引用都不用改。
