#!/usr/bin/env bash
# 在 Hugo 站点根目录运行：
#   bash themes/flavor/scripts/encrypt.sh
#   ENCRYPT_ALL=1 bash themes/flavor/scripts/encrypt.sh   # 强制重加密全部
#   ENCRYPT_PASSWORD=xxx 时所有文章用同一密码；否则逐篇提示。
set -euo pipefail

ENC="$(cd "$(dirname "$0")" && pwd)/encrypt.mjs"

node "$ENC" --prepare
HUGO_ENCRYPT_PLAIN=1 hugo --quiet --buildFuture --cleanDestinationDir

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
