#!/bin/bash
set -euo pipefail

# 1. content/private/ 明文源 → content/post/（临时完整版，供 hugo 渲染）
node scripts/encrypt.mjs --prepare

# 2. 渲染明文站点（HUGO_ENCRYPT_PLAIN=1 让加密文章输出明文正文；--buildFuture 与 Actions 一致）
HUGO_ENCRYPT_PLAIN=1 hugo --quiet --buildFuture

# 3. 加密有变更的文章（交互输入密码；多篇同密码可预设 ENCRYPT_PASSWORD）
LIST=$(node scripts/encrypt.mjs --list || true)
if [ -n "$LIST" ]; then
  echo "→ 发现需要（重新）加密的文章："
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    slug=${line%%$'\t'*}
    title=${line#*$'\t'}
    if [ -n "${ENCRYPT_PASSWORD:-}" ]; then
      pwd="$ENCRYPT_PASSWORD"
    else
      read -s -p "  「${title}」的密码: " pwd < /dev/tty
      echo
    fi
    ENCRYPT_PASSWORD="$pwd" node scripts/encrypt.mjs --slug "$slug"
    unset pwd
  done <<< "$LIST"
fi

# 4. 兜底：确保 content 下加密文章都是 stub（无明文残留）
node scripts/encrypt.mjs --stubify-all

# 5. 提交源码 + 加密数据（public 在 .gitignore，不会提交）
git add .
git commit -m "Update site: $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main
