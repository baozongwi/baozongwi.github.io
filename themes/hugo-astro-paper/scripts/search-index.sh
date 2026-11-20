#!/usr/bin/env bash
# Build the exampleSite, generate the Pagefind search index, and copy the
# bundle into exampleSite/static/pagefind/ so that both
#
#   hugo server --themesDir ../..          (dev, live-reload)
#   pagefind -site public                  (static preview)
#
# can serve working search.
#
# Usage: scripts/search-index.sh   (from the theme root)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXAMPLE="$ROOT/exampleSite"
BIN="$ROOT/bin/pagefind"
VERSION="1.4.0"

# --- fetch the pagefind binary if missing ---
if [ ! -x "$BIN" ]; then
  echo "Downloading pagefind v$VERSION …"
  mkdir -p "$ROOT/bin"
  if [[ "$(uname -sm)" == "Darwin arm64" ]]; then
    ASSET="pagefind-v$VERSION-aarch64-apple-darwin.tar.gz"
  elif [[ "$(uname -sm)" == "Darwin x86_64" ]]; then
    ASSET="pagefind-v$VERSION-x86_64-apple-darwin.tar.gz"
  elif [[ "$(uname -sm)" == "Linux x86_64" ]]; then
    ASSET="pagefind-v$VERSION-x86_64-unknown-linux-musl.tar.gz"
  else
    echo "unsupported platform: $(uname -sm)" >&2
    exit 1
  fi
  curl -sL "https://github.com/Pagefind/pagefind/releases/download/v$VERSION/$ASSET" \
    | tar -xz -C "$ROOT/bin"
fi

# --- build + index ---
cd "$EXAMPLE"
hugo --themesDir ../.. --destination public
"$BIN" --site public

# --- make the index visible to `hugo server` as a static asset ---
rm -rf "$EXAMPLE/static/pagefind"
cp -R "$EXAMPLE/public/pagefind" "$EXAMPLE/static/pagefind"

echo ""
echo "Done. The search overlay now works under 'hugo server' too."
echo "(exampleSite/static/pagefind is generated — it's gitignored.)"
