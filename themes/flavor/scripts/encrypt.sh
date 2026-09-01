#!/usr/bin/env bash
# 在 Hugo 站点根目录运行：
#   bash themes/flavor/scripts/encrypt.sh
set -euo pipefail

ENC="$(cd "$(dirname "$0")" && pwd)/encrypt.mjs"

node "$ENC" --prepare
HUGO_ENCRYPT_PLAIN=1 hugo --quiet --buildFuture --cleanDestinationDir

LIST="$(node "$ENC" --list || true)"
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
