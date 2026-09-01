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

<!-- 在此撰写正文。明文放 content/private/，加密后仓库只留 stub + data/encrypted/。
     完成后运行 bash themes/flavor/scripts/encrypt.sh（会提示输入密码）。
     front matter 中 encrypted 与 slug 请保留。 -->
