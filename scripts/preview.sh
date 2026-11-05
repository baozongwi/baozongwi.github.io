#!/bin/bash
set -euo pipefail

# 本地预览。`hugo server` 不跑 Pagefind，搜索框会直接显示
# "Search index unavailable"，所以这里先出静态文件、建索引，再用静态服务器打开。
#
#   ./scripts/preview.sh          1313 端口
#   PORT=8080 ./scripts/preview.sh

PORT="${PORT:-1313}"

cd "$(dirname "$0")/.."

echo "→ 构建 public/"
hugo --minify --buildFuture --cleanDestinationDir

# Pagefind: 优先用已在 PATH 里的，否则临时拉 npx 的固定版本（和 CI 保持一致）。
if command -v pagefind >/dev/null 2>&1; then
  echo "→ 生成搜索索引（pagefind）"
  pagefind --site public
elif command -v npx >/dev/null 2>&1; then
  echo "→ 生成搜索索引（npx pagefind@1.5.0，首次会下载）"
  npx --yes pagefind@1.5.0 --site public
else
  echo "! 没找到 pagefind / npx，跳过搜索索引（页面其它部分正常，只是搜索不可用）"
fi

echo "→ http://127.0.0.1:${PORT}/"
exec python3 -m http.server "$PORT" --directory public
