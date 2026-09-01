# Flavor

Paper-light / blue-dark Hugo theme for technical blogs, with CJK serif and encrypted posts.

演示：[baozongwi.xyz](https://baozongwi.xyz)

需要 **Hugo Extended 0.146+**（开发时用的 0.163.1）。

## 安装

```bash
git clone https://github.com/baozongwi/flavor.git themes/flavor
cp themes/flavor/hugo.toml.example hugo.toml
```

改 `hugo.toml` 里的域名、名字、菜单。`hugo server` 能起来就算接上了。

页面用这些 layout（在 `content/page/` 下建对应目录即可）：

| 页面 | front matter |
|---|---|
| 关于 | `layout: about` |
| 归档 | `layout: archives` |
| 友链 | `layout: links` |
| 游记列表 | `layout: travel` |

搜索是顶栏的 overlay，没有单独的 `/search` 页。部署时在 `public/` 上跑一次 [Pagefind](https://pagefind.app/)：

```bash
npx -y pagefind@1.5.0 --site public
```

## 友链

`data/friends.yaml`，分组名随意，`Team` 和 `Links` 会排在最前，组内卡片每次刷新随机顺序。

```yaml
Team:
  - name: su-team
    url: https://su-team.cn/
    avatar: /friends/avatars/su-team.png

Links:
  - name: someone
    url: https://example.com
    avatar: /friends/avatars/someone.jpg
    description: 可选
```

头像放到 `static/friends/avatars/`。

## 加密文章

AES-256-GCM + PBKDF2，浏览器 Web Crypto 解密。明文只放 `content/private/`，**不要提交**；仓库里是 stub + `data/encrypted/<slug>.json`。

```bash
echo 'content/private/' >> .gitignore
hugo new --kind encrypted "private/secret-note/secret-note.md"
```

front matter 里 `encrypted: true` 和 `slug` 必须有。写完：

```bash
bash themes/flavor/scripts/encrypt.sh
```

会提示输入密码。多篇同一密码可以 `ENCRYPT_PASSWORD=xxx bash themes/flavor/scripts/encrypt.sh`。

部署侧照常 `hugo`，不要设 `HUGO_ENCRYPT_PLAIN`。文章图片放到 private 同级目录，脚本会拷到 `static/p/<slug>/`。

## 游记

普通文章，多一个 `travel: true`，列表页按年份收。

```bash
hugo new --kind travel "page/游记/2026/杭州记/杭州记.md"
```

把 `url` 改成英文，例如 `/travel/hangzhou-2026-09/`。图片放同级 `assets/`：

```markdown
![](assets/001.png)
```

## 欢迎页 / 说说 / 打字机

```toml
[params]
  status = "忙碌的生活中"

  [params.welcome]
    enabled = true
    text = "越想越难耐"

  [params.typewriter]
    slogans = ["天地不仁，以万物为刍狗"]
```

`welcome.text` 不填就不显示欢迎页。首页 hero 的那句说说是 `params.status`。

## 字体

主题**不附带**任何字体文件。演示站用的是仓耳今楷 02（妙言），版权归原作者，不能跟着主题分发。

自己有切好的 unicode-range 文件就丢进 `static/fonts/`，再配：

```toml
[params.font]
  css = "fonts/your-font/result.css"
  preload = "fonts/your-font/xxxx.woff2"
```

不配的话走 `Songti SC / STSong / Noto Serif SC`。

## 图片

正文图默认转 webp、最长边 1600、q80。GIF / SVG 不转。

文章和图片很多时，建议把原图挂到 `assets` 再处理（演示站就是这么做的），配置见仓库里博客站点的 `hugo.yaml` `module.mounts`。不配也能用，图会按 Hugo page resource 处理。

## License

MIT。
