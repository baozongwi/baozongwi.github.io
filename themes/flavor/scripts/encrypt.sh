#!/usr/bin/env bash
# 在 Hugo 站点根目录运行：
#   bash themes/flavor/scripts/encrypt.sh
#   ENCRYPT_ALL=1 bash themes/flavor/scripts/encrypt.sh   # 强制重加密全部
#   ENCRYPT_PASSWORD=xxx 时所有文章用同一密码；否则逐篇提示。
set -euo pipefail

ENC="$(cd "$(dirname "$0")" && pwd)/encrypt.mjs"

# 明文构建进临时目录：hugo server 默认也写 public/，并发重建会把锁定态页面
# 盖到 public/，导致加密时读不到正文。ENCRYPT_PLAIN_DIR 告诉脚本去哪里读。
PLAIN_OUT="$(mktemp -d "${TMPDIR:-/tmp}/blog-encrypt-plain.XXXXXX")"
export ENCRYPT_PLAIN_DIR="$PLAIN_OUT"
cleanup() { node "$ENC" --stubify-all >/dev/null 2>&1 || true; rm -rf "$PLAIN_OUT"; }
trap cleanup EXIT

node "$ENC" --prepare
HUGO_ENCRYPT_PLAIN=1 hugo --quiet --buildFuture --cleanDestinationDir --destination "$PLAIN_OUT"

LIST_CMD=--list
if [ "${ENCRYPT_ALL:-}" = 1 ]; then LIST_CMD=--list-all; fi
LIST="$(node "$ENC" "$LIST_CMD" || true)"
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
    ENCRYPT_PASSWORD="$pwd" node "$ENC" --slug "$slug"
    unset pwd
  done <<< "$LIST"
fi

node "$ENC" --stubify-all
