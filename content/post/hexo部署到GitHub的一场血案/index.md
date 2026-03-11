+++
title = "hexo部署到GitHub的一场血案"
slug = "hexo-github-deployment-troubleshooting"
description = ""
date = "2024-08-08T21:19:14"
lastmod = "2024-08-08T21:19:14"
image = ""
license = ""
categories = ["talk"]
tags = ["小站"]
+++

# 0x01 前言

介于第一个友链的诞生，那我必须得第一时间部署`blog`到`GitHub`，但是确实并没有那么顺畅，于是找到了几种方法来解决这个问题

# 0x02 action

## ssl错误

这个可能是ssl证书或者是短暂的，但是不说那么多，直接上解决方案

首先第一种

将`https`地址换成`ssh`链接的

```
deploy:
  type: git
  repo: https://github.com/baozongwi/baozongwi.github.io.git/
  branch: main
```

替换为

```
deploy:
  type: git
  repo: git@github.com:baozongwi/baozongwi.github.io.git
  branch: main
```

第二种，忽略`ssl`链接

```
git config --global http.sslVerify "false"
```

## GitHub超时

首先看看自己网络是否有问题

```
ping github.com
```



第一种设置`proxy`

取消`proxy`

```
git config --global --unset http.proxy

git config --global --unset https.proxy
```

设置`proxy`

```
git config --global http.proxy http://127.0.0.1:1080

git config --global https.proxy https://127.0.0.1:1080
```

查看`proxy`

```
git config --global http.proxy

git config --global https.proxy
```

## 权限问题

由于是GitHub的仓库，所以我并没有遇到过这个问题欸

# 0x03 小结

还是得早点买个域名解析`GitHub`的仓库，那不然很影响的

