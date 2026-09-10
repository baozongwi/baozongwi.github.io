# flavor-stats

站点自己的访问计数，不进 flavor 主题。思路对齐 [vercount](https://github.com/evannotfound/vercount)：浏览器 POST、Cookie 去重 UV。单站、无后台，JSON 落盘。

页脚和脚本在仓库根的 `layouts/`、`assets/js/stats.js`，由 Hugo 盖住主题同名文件。

起算：207841 PV / 46153 UV。线上挂在已有证书的 `https://su-team.cn/count`。

```
POST /hit     {"uv": true|false}  → {"pv":…,"uv":…}
GET  /stats                       → {"pv":…,"uv":…}
GET  /health
POST /admin/set   Authorization: Bearer $STATS_ADMIN_TOKEN
```

本机构建（交叉到服务器）：

```bash
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o flavor-stats .
```

服务器：`/opt/flavor-stats/` + systemd `flavor-stats.service`，Caddy 反代 `/count/*`。
