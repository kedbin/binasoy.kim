#!/usr/bin/env bash
# Finish the GitHub Pages -> Cloudflare Workers cut-over. Run after the old GitHub Pages DNS records
# (A 185.199.108-111.153, AAAA 2606:50c0:800x::153, CNAME www -> kedbin.github.io) are deleted in the dashboard.
set -euo pipefail
npm run typecheck && npx vite build
npx wrangler deploy                      # attaches binasoy.kim + www.binasoy.kim as Workers Custom Domains
for i in $(seq 1 30); do
  s=$(curl -sI https://binasoy.kim | grep -i '^server:' || true)
  echo "binasoy.kim -> ${s:-?}"; case "$s" in *cloudflare*) break;; esac; sleep 10
done
curl -s -o /dev/null -w 'api reject check: %{http_code} (expect 403)\n' -X POST -H 'Content-Type: application/json' -H 'Origin: https://evil.example' -d '{}' https://binasoy.kim/api/contact
read -rp "Site served by Cloudflare. Unpublish GitHub Pages now? [y/N] " a
[ "$a" = y ] && gh api -X DELETE repos/kedbin/binasoy.kim/pages && echo "GitHub Pages unpublished"
