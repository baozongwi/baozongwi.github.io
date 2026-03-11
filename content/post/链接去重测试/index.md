---
title: "链接去重测试"
date: 2024-11-15T20:00:00+08:00
description: "测试百分编码URL去重功能"
tags: ["测试", "URL", "去重"]
---

## 测试正文中的引用块

> 这是一个正文中的引用块，包含链接：https://example.com/article
> 这些链接不应该出现在参考阅读面板中

正文中的普通链接：https://blog.example.com/post/123 也不应该被提取

## 测试内容

这里是一些正文内容，包含各种链接格式：

- [Markdown链接](https://markdown.example.com/page)
- <https://angle.example.com/url>
- 裸链接：https://bare.example.com/link

> 这是另一个正文引用块
> https://another.example.com/ref

## 参考阅读

> https://www.ctfshow.com/2021/08/30/CTFSHOW-Java%E5%8F%8D%E5%BA%8F%E5%88%97%E5%8C%96-wp/
> https://www.ctfshow.com/2021/08/30/CTFSHOW-Java反序列化-wp/
> [CTFSHOW Java反序列化](https://www.ctfshow.com/2021/08/30/CTFSHOW-Java%E5%8F%8D%E5%BA%8F%E5%88%97%E5%8C%96-wp/)
> <https://www.ctfshow.com/2021/08/30/CTFSHOW-Java反序列化-wp/>
> https://github.com/example/repo
> [GitHub示例](https://github.com/example/repo)
> <https://github.com/example/repo>