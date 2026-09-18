# flavor-stats

站点自己的访问计数，不进 flavor 主题。思路对齐 [vercount](https://github.com/evannotfound/vercount)：浏览器 POST、Cookie 去重 UV。单站、无后台，JSON 落盘。

页脚和脚本在仓库根的 `layouts/`、`assets/js/stats.js`，由 Hugo 盖住主题同名文件。

起算：207841 PV / 46153 UV。线上挂在已有证书的 `https://su-team.cn/count`。

```
POST /hit     {"uv": true|false}  → {"pv":…,"uv":…}
GET  /stats                       → {"pv":…,"uv":…}
GET  /health
POST /admin/set   Authorization: Bearer $STATS_ADMIN_TOKEN

GET  /guestbook                   → {"messages":[{id,name,text,time,replies?},…]}
POST /guestbook   {name,text,email?,whisper?,company?}
POST /guestbook/reply   {id,text}  Authorization: Bearer $STATS_ADMIN_TOKEN  → 站主跟帖
POST /guestbook/reply   {id,name,text,email?}  → 访客跟帖（同一楼多轮）
GET  /guestbook/auth              Authorization: Bearer $STATS_ADMIN_TOKEN
POST /guestbook/delete  {id}  Authorization: Bearer $STATS_ADMIN_TOKEN
```

净土和计数共用进程。公开条目在 `guestbook.json`（不含邮箱）。悄悄话和带邮箱的备份在 `guestbook-private.json`（0600，不对外）。蜜罐字段 `company` 非空则假装成功但不落盘。同一 IP 两条间隔 2 分钟，每天最多 8 条。

QQ SMTP（465 隐式 TLS / 587 STARTTLS）用环境变量，**不要写进仓库**：

```
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=you@qq.com
SMTP_PASS=16位授权码
SMTP_FROM=you@qq.com
SMTP_TO=you@qq.com
```

一楼可多轮：访客点「跟帖」，站主解锁后点「回复」，都是追加不会覆盖。折叠块显示整段对话。对方留过邮箱则站主每次回复都会发信。`smtp.SendMail` 对 465 会失败（它走 STARTTLS），这里用 `tls.Dial` 再 `smtp.NewClient`。

本机构建（交叉到服务器）：

```bash
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o flavor-stats .
```

服务器：`/opt/flavor-stats/` + systemd `flavor-stats.service`，Caddy 反代 `/count/*`。
