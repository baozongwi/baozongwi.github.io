---
title: "{{ replace .Name "-" " " | title }}"
slug: "{{ .Name | urlize }}"
description: ""
date: "{{ .Date }}"
lastmod: "{{ .Date }}"
encrypted: true
categories: []
tags: []
---

<!-- 在此撰写正文。完成后运行 ./update.sh 部署（会提示输入密码）。
     front matter 中 encrypted 与 slug 请保留，其余字段可自行调整。 -->
