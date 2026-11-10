# Cloudflare Worker (site + CampMail API)

`wrangler.jsonc` serves `dist/` as static assets and runs `worker/index.ts` only for `/api/*`.

## POST /api/contact
Every check runs on the server, so a visitor cannot use the form to email anyone else:

| Check | Fails with |
|---|---|
| `Origin` is in `ALLOWED_ORIGINS`, JSON body, under 16 KB | 403 refused / 400 invalid |
| Per-IP rate limit, 5 per minute (`CONTACT_LIMIT`) | 429 busy |
| `message` 1–5000 characters, subject up to 200, name up to 100; `email` is optional and must look like an address | 400 invalid |
| Honeypot `trap` is empty, and the form was open between 3 s and 24 h (`mountedAt`) | 403 refused |
| Turnstile token passes `siteverify`, with hostname in `TURNSTILE_HOSTNAMES` and action `contact` | 403 captcha |

- The recipient is the `CONTACT_TO` secret. Request bodies cannot change it.
- The visitor's address only goes in `Reply-To`.
- CR/LF is stripped from every header value.
- Mail is sent through the Email Routing `send_email` binding from `campmail@binasoy.kim`. `CONTACT_TO` must be a verified destination address in Email Routing.

## Setup (already done once for this account)
- Turnstile widget: "binasoy.kim CampMail". Its public site key is in `.env.production`.
- Worker secrets: `npx wrangler secret put TURNSTILE_SECRET` and `npx wrangler secret put CONTACT_TO`.
- Local development: copy `.dev.vars.example` to `.dev.vars`, then run `npm run cf:dev`.
  - This serves the site and the API on :8787 with Turnstile test keys.
  - Mail is written to `.wrangler/tmp/email/` instead of being sent.
- Deploy with `npm run deploy`, or the "Deploy to Cloudflare Workers" workflow, which needs the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- Domain cut-over from GitHub Pages:
  1. Uncomment `routes` in `wrangler.jsonc`.
  2. Run `npm run deploy`. Cloudflare creates the DNS records. Remove the old GitHub Pages records for `binasoy.kim` first if it complains.
  3. Switch the workflow to run on push and retire `deploy.yml`.
