---
title: "{{ replace .Name "-" " " | title }}"
description: ""
date: "{{ .Date }}"
url: "/travel/{{ .Name | urlize }}/"
travel: true
nonRSS: true
---

<!-- 把 url 改成英文 slug，如 /travel/escaping-from-beijing/。
     图片放本目录 assets/，正文用 ![](assets/001.png)。 -->
