+++
title= "Hello Actions"
slug= "hello-actions"
description= ""
date= "2026-03-11T20:36:24+08:00"
lastmod= "2026-03-11T20:36:24+08:00"
image= ""
license= ""
categories= ["talk"]
tags= [""]

+++

看到这里的时候，我已经用上 actions 进行博客更新了，挺方便的，比在本地部署快很多，也很简单，问 AI 写几个文件就操作好了，唯一让我有点烦的就是生成 key 的时候，emm，没起好名字，后来改也不好改，还有就是时差

test
test

通过探索发现，使用这样的`yml`是能绕过时差机制的，然后域名解析我们需要去掉，这样就没问题了

```yml
name: Deploy Hugo Site

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    concurrency:
      group: ${{ github.workflow }}-${{ github.ref }}
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: "0.157.0"
          extended: true

      - uses: actions/configure-pages@v5

      - run: hugo --minify --buildFuture --cleanDestinationDir

      - run: node scripts/encrypt.js

      - uses: actions/upload-pages-artifact@v4
        with:
          path: ./public

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4

```

![img](1.png)

