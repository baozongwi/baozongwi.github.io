#!/bin/bash
set -euo pipefail

# 第 1 步会把明文铺到 content/post/<slug>/index.md，第 4 步才裁回 stub。
# 中间任何中断（Ctrl-C、hugo 报错）都不能让明文留在可提交路径里。
#
# 第 2 步渲染到独立临时目录，不写 public/：hugo server 默认也会把页面落盘到
# public/，一旦在加密中途重建（它不带 HUGO_ENCRYPT_PLAIN），第 3 步就会读到
# 锁定态页面并报 “未找到 <div class="article-content">”。ENCRYPT_PLAIN_DIR
# 让 encrypt.mjs 去临时目录取明文。
PLAIN_OUT="$(mktemp -d "${TMPDIR:-/tmp}/blog-encrypt-plain.XXXXXX")"
export ENCRYPT_PLAIN_DIR="$PLAIN_OUT"

cleanup_plaintext() {
  node scripts/encrypt.mjs --stubify-all >/dev/null 2>&1 || true
  rm -rf "$PLAIN_OUT"
}
on_interrupt() {
  echo "→ 中断：把 content/post 下的加密文章裁回 stub，避免明文入库" >&2
  exit 130  # the EXIT trap above does the cleanup exactly once
}
trap cleanup_plaintext EXIT
trap on_interrupt INT TERM

# 1. content/private/ 明文源 → content/post/（临时完整版，供 hugo 渲染）
node scripts/encrypt.mjs --prepare

# 2. 渲染明文站点到临时目录（不碰 public/，避免和 dev server 抢同一个目录）
HUGO_ENCRYPT_PLAIN=1 hugo --quiet --buildFuture --cleanDestinationDir --destination "$PLAIN_OUT"

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

# 先直接推。远程没动时和原来一样，只连一次 GitHub。
# 被拒绝时才 fetch + rebase：circle.yml 会往 main 推 "Update circle feeds"。
if git push origin HEAD:main; then
  exit 0
fi

echo "→ 远程 main 有新提交，正在变基后重试"
for attempt in 1 2 3; do
  git fetch origin main
  if ! git rebase origin/main; then
    git rebase --abort || true
    echo "变基到 origin/main 失败，仓库已恢复到变基前。请处理冲突后再运行 ./update.sh" >&2
    exit 1
  fi
  if git push origin HEAD:main; then
    exit 0
  fi
  echo "→ 推送仍被拒绝，正在重试（${attempt}/3）"
  sleep 2
done
echo "推送到 origin/main 失败" >&2
exit 1
