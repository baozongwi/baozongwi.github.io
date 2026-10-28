#!/bin/bash
set -euo pipefail

# 1. content/private/ 明文源 → content/post/（临时完整版，供 hugo 渲染）
node scripts/encrypt.mjs --prepare

# 2. 渲染明文站点（同时清掉已销户 tag 遗留的旧页面）
HUGO_ENCRYPT_PLAIN=1 hugo --quiet --buildFuture --cleanDestinationDir

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
if git diff --cached --quiet; then
  echo "→ 没有新的改动，跳过提交"
else
  git commit -m "Update site: $(date '+%Y-%m-%d %H:%M:%S')"
fi

# circle.yml 每天会往 main 推 "Update circle feeds"。
# 不先接上这些提交，push 会被 non-fast-forward 拒绝。
pushed=0
for attempt in 1 2 3; do
  git fetch origin main
  if ! git rebase origin/main; then
    git rebase --abort || true
    echo "变基到 origin/main 失败，仓库已恢复到变基前。请处理冲突后再运行 ./update.sh" >&2
    exit 1
  fi
  if git push origin HEAD:main; then
    pushed=1
    break
  fi
  echo "→ 推送被拒绝，正在重试（${attempt}/3）"
  sleep 2
done
if [ "$pushed" -ne 1 ]; then
  echo "推送到 origin/main 失败" >&2
  exit 1
fi
