+++
title= "关于我使用Trae优化Stack这件事"
slug= "trae-optimize-stack"
description= "现在的博客真是越来越顺眼了😝"
date= "2025-11-13T01:42:52+08:00"
lastmod= "2025-11-13T01:42:52+08:00"
image= ""
license= ""
categories= ["talk"]
tags= [""]

+++

昨天下午，在公司闲来无事，想着自己的博客主题 Stack 有很多小细节都不满意，最近用 Trae 这个 MCP Tools 也越来越顺手，于是我想着要不就微微的优化一下自己的主题？

说干就干，优化的功能如下：

首先要优化的就是图片的灯窗，由于之前有个灯窗，但是那个功能我是不需要的，而且主题渲染文章中的图片，由于进行了一层编码，所以会影响到图片的颜色，直接就不是原图了😂

评论、以及分类的图片预览，每篇文末的“推荐文章”功能都进行删除，添加友情提示文章时限、文章总字数统计、参考链接。

RSS模版进行优化，只取首页文章，截取 150 字节字符到 item，使得更加轻便，订阅更方便（欢迎大哥们订阅）

添加友链自动渲染功能，之前我是直接使用的 markdown 语法的表格来置放大佬们的友链，新建了一个`data/friends.yaml`其中放信息，格式如下

```yaml
Team:
    - name: su-team
      url: https://su-team.cn/
    - name: cdusec
      url: https://cdusec.com/

Links:
    - name: "sun.empty"
      url: https://sun1028.top/
```

在博客根目录放了一个`layouts/page/links.html`来进行渲染，代码如下

```html
{{ define "body-class" }}
  article-page
  {{- $hasWidgetNotTOC := false -}}
  {{- $tocEnabled := false -}}
  {{- range .Site.Params.widgets.page -}}
    {{- if ne .type "toc" }}{{ $hasWidgetNotTOC = true }}{{ else }}{{ $tocEnabled = true }}{{ end -}}
  {{- end -}}
  {{- $tocOff := eq .Params.toc false -}}
  {{- $toc := and (not $tocOff) $tocEnabled -}}
  {{- $hasTOC := ge (len .TableOfContents) 100 -}}
  {{- .Scratch.Set "TOCEnabled" (and $toc $hasTOC) -}}
  {{- .Scratch.Set "hasWidget" (or $hasWidgetNotTOC (and $toc $hasTOC)) -}}
{{ end }}

{{ define "main" }}
<article class="main-article">
  {{ partial "article/components/header" . }}
  <section class="article-content">
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Group</th><th>Name</th><th>Link</th></tr></thead>
        <tbody>
          {{ $friends := .Site.Data.friends }}
          {{ range $group := slice "Team" "Links" }}
            {{ $list := index $friends $group }}
            {{ if $list }}
              {{ $han := slice }}{{ $alpha := slice }}{{ $num := slice }}{{ $other := slice }}
              {{ range $list }}
                {{ $f := substr .name 0 1 }}
                {{ $lf := lower $f }}
                {{ if (findRE "^[\\p{Han}]" $f) }}
                  {{ $han = $han | append (dict "name" .name "url" .url "key" (default (lower .name) .key)) }}
                {{ else if (findRE "^[a-z]" $lf) }}
                  {{ $alpha = $alpha | append (dict "name" .name "url" .url "key" (default (lower .name) .key)) }}
                {{ else if (findRE "^[0-9]" $f) }}
                  {{ $num = $num | append (dict "name" .name "url" .url "key" (default (lower .name) .key)) }}
                {{ else }}
                  {{ $other = $other | append (dict "name" .name "url" .url "key" (default (lower .name) .key)) }}
                {{ end }}
              {{ end }}

              {{ $rows := slice }}
              {{ range sort $han "key" }}  {{ $rows = $rows | append . }}{{ end }}
              {{ range sort $alpha "key" }}{{ $rows = $rows | append . }}{{ end }}
              {{ range sort $num "key" }}  {{ $rows = $rows | append . }}{{ end }}
              {{ range sort $other "key" }}{{ $rows = $rows | append . }}{{ end }}

              {{ $count := len $rows }}
              {{ range $i, $it := $rows }}
                <tr>
                  {{ if eq $i 0 }}<td rowspan="{{ $count }}">{{ $group }}</td>{{ end }}
                  <td>{{ $it.name }}</td>
                  <td><a href="{{ $it.url }}" target="_blank" rel="noopener">{{ $it.url }}</a></td>
                </tr>
              {{ end }}
            {{ end }}
          {{ end }}
        </tbody>
      </table>
    </div>

    {{ if .Content }}<div class="mt-4">{{ .Content }}</div>{{ end }}
  </section>
  {{ partial "article/components/footer" . }}
</article>
{{ end }}

{{ define "right-sidebar" }}
  {{ if .Scratch.Get "hasWidget" }}{{ partial "sidebar/right.html" (dict "Context" . "Scope" "page") }}{{ end }}
{{ end }}

```

后续应该不太可能会有更新了，但是我个人认为是个改的不错的主题🤓

