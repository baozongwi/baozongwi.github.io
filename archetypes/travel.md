---
title: "{{ replace .Name "-" " " | title }}"
description: ""
date: "{{ .Date }}"
url: "/travel/"
travel: true
nonRSS: true
---

<!-- 游记模板：请将 url 改为英文 slug 形式，如 /travel/escaping-from-beijing/。
     正文图片放在本目录 assets/ 下，用 ![](./assets/001.png) 引用。
     完成后运行 ./update.sh 部署。 -->
