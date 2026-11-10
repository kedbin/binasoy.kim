#!/usr/bin/env bash
# Release: typecheck + build, snapshot the working tree to the Cloudflare Artifacts repo (branch main),
# then deploy the Worker with that snapshot's SHA as the version message.
# Does not touch local branches or the git index. Secrets (.dev.vars, .tmp/) are git-ignored and never included.
#   bash scripts/release.sh "what changed"
set -euo pipefail
MSG="${1:-release}"
REPO=binasoy-kim-source
NS=default
REMOTE=https://d29257cf0fef4a79a4a33e29daf91408.artifacts.cloudflare.net/git/$NS/$REPO.git

npm run typecheck
npx vite build

TOK=$(npx wrangler artifacts repos issue-token "$REPO" --namespace "$NS" --json 2>/dev/null \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).plaintext))")
AUTH="http.extraHeader=Authorization: Bearer $TOK"

# parent = current Artifacts main (linear history there), else local HEAD
PARENT=$(git -c "$AUTH" ls-remote "$REMOTE" refs/heads/main | cut -f1)
if [ -n "$PARENT" ] && ! git cat-file -e "$PARENT" 2>/dev/null; then git -c "$AUTH" fetch -q "$REMOTE" main; fi
[ -n "$PARENT" ] || PARENT=$(git rev-parse HEAD)

IDX=$(git rev-parse --git-dir)/release-index
rm -f "$IDX"
GIT_INDEX_FILE="$IDX" git read-tree HEAD
GIT_INDEX_FILE="$IDX" git add -A
TREE=$(GIT_INDEX_FILE="$IDX" git write-tree); rm -f "$IDX"
if [ "$(git rev-parse "$PARENT^{tree}")" = "$TREE" ]; then SNAP=$PARENT; echo "No source changes since ${PARENT:0:12}"
else
  SNAP=$(git commit-tree "$TREE" -p "$PARENT" -m "release: $MSG" -m "local HEAD $(git rev-parse --short HEAD), $(date -u +%FT%TZ)")
  git -c "$AUTH" push -q "$REMOTE" "$SNAP:refs/heads/main"
  echo "Artifacts: $REPO@main -> ${SNAP:0:12}"
fi

npx wrangler deploy --message "${SNAP:0:12} $MSG"
