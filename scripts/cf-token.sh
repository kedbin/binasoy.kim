#!/usr/bin/env bash
# Paste a Cloudflare API token (input hidden). Verifies it, stores it as the GitHub secret
# CLOUDFLARE_API_TOKEN and in .tmp/.cf-token (git-ignored) for the local cut-over.
set -euo pipefail
cd "$(dirname "$0")/.."
read -rsp "Paste Cloudflare API token: " T; echo
v=$(curl -s -H "Authorization: Bearer $T" https://api.cloudflare.com/client/v4/user/tokens/verify)
echo "$v" | grep -q '"status":"active"' || { echo "Token not active: $v"; exit 1; }
printf '%s' "$T" | gh secret set CLOUDFLARE_API_TOKEN && echo "GitHub secret CLOUDFLARE_API_TOKEN set"
umask 077; printf '%s' "$T" > .tmp/.cf-token && echo "Saved .tmp/.cf-token. Done, you can close this pane."
