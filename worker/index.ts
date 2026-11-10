// Cloudflare Worker: serves the built site (dist/, static assets) and one API route, POST /api/contact.
// CampMail (KimOS) posts here. Every check is server-side; the browser is never trusted:
//   1. same-origin only (Origin header allow-list) + JSON content type + 16 KB body cap
//   2. per-IP rate limit (Workers Rate Limiting binding)
//   3. Cloudflare Turnstile token verified with siteverify (hostname checked in production)
//   4. honeypot field empty, form open for >= 3 s, field lengths, reply-to address shape
//   5. recipient is fixed server-side (secret CONTACT_TO, which must also be a verified Email Routing
//      destination); the visitor's address only ever goes in Reply-To, never From/To, and every header
//      value is stripped of CR/LF so it cannot inject headers. So the form cannot be used to mail anyone else.
import { EmailMessage } from 'cloudflare:email';

export interface Env {
  ASSETS: Fetcher;
  MAILER: SendEmail;
  CONTACT_LIMIT?: RateLimit;
  /** secret: Turnstile secret key */
  TURNSTILE_SECRET: string;
  /** secret: where messages are delivered (verified Email Routing destination) */
  CONTACT_TO: string;
  /** var: sender on the Email Routing zone, e.g. campmail@binasoy.kim */
  CONTACT_FROM: string;
  /** var: comma-separated origins allowed to post */
  ALLOWED_ORIGINS: string;
  /** var: comma-separated hostnames Turnstile tokens may come from ("" = skip check, local dev) */
  TURNSTILE_HOSTNAMES?: string;
}

type Reason = 'invalid' | 'captcha' | 'refused' | 'busy' | 'server';
const MAX_BODY = 16 * 1024;
const MIN_OPEN_MS = 3000;
const MAX_OPEN_MS = 24 * 3600 * 1000;
const TEMPLATES = new Set(['work', 'cloud', 'van', 'feedback', 'other']);
const EMAIL_RE = /^[^\s@<>()",;:]{1,64}@[^\s@<>()",;:]{1,190}\.[a-z]{2,24}$/i;

const json = (status: number, body: { ok: boolean; reason?: Reason }, extra: HeadersInit = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra } });
const fail = (status: number, reason: Reason) => json(status, { ok: false, reason });

export default {
  async fetch(req, env, ctx): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/api/contact') {
      if (req.method !== 'POST') return json(405, { ok: false, reason: 'invalid' }, { allow: 'POST' });
      try { return await contact(req, env, ctx); } catch (e) { console.error('contact failed', e); return fail(500, 'server'); }
    }
    if (url.pathname.startsWith('/api/')) return fail(404, 'invalid');
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;

async function contact(req: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  // 1. same origin, JSON, small
  const origin = req.headers.get('origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return fail(403, 'refused');
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return fail(400, 'invalid');
  const raw = await req.text();
  if (raw.length > MAX_BODY) return fail(400, 'invalid');

  // 2. rate limit per client IP
  const ip = req.headers.get('cf-connecting-ip') ?? 'unknown';
  if (env.CONTACT_LIMIT) {
    const { success } = await env.CONTACT_LIMIT.limit({ key: ip });
    if (!success) return fail(429, 'busy');
  }

  let b: Record<string, unknown>;
  try { b = JSON.parse(raw); } catch { return fail(400, 'invalid'); }
  if (!b || typeof b !== 'object') return fail(400, 'invalid');
  const str = (k: string, max: number) => (typeof b[k] === 'string' ? (b[k] as string).trim() : '').slice(0, max + 1);
  const message = str('message', 5000), subject = str('subject', 200), email = str('email', 254), name = str('name', 100);
  const template = str('template', 20), trap = typeof b.trap === 'string' ? b.trap : '', token = str('turnstileToken', 2048);
  const mountedAt = typeof b.mountedAt === 'number' ? b.mountedAt : NaN;

  // 4. cheap checks before calling Turnstile
  if (!message || message.length > 5000 || subject.length > 200 || name.length > 100 || email.length > 254) return fail(400, 'invalid');
  if (email && !EMAIL_RE.test(email)) return fail(400, 'invalid');
  if (template && !TEMPLATES.has(template)) return fail(400, 'invalid');
  if (trap) return fail(403, 'refused');
  const open = Date.now() - mountedAt;
  if (!Number.isFinite(open) || open < MIN_OPEN_MS || open > MAX_OPEN_MS) return fail(403, 'refused');

  // 3. Turnstile, verified server-side
  if (!token) return fail(403, 'captcha');
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  form.append('remoteip', ip);
  form.append('idempotency_key', crypto.randomUUID());
  const tv = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const ts = (await tv.json()) as { success: boolean; hostname?: string; action?: string; 'error-codes'?: string[] };
  if (!ts.success) return fail(403, 'captcha');
  const hosts = (env.TURNSTILE_HOSTNAMES ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (hosts.length && !hosts.includes(ts.hostname ?? '')) return fail(403, 'captcha');
  if (ts.action && ts.action !== 'contact') return fail(403, 'captcha');

  // 5. send to the fixed recipient
  const mime = buildMime({
    from: env.CONTACT_FROM, to: env.CONTACT_TO, replyTo: email || undefined,
    subject: '[CampMail] ' + (subject || 'A note from the van'),
    text: [
      message,
      '',
      '--',
      'From: ' + (name || '(no name)') + ' <' + (email || 'no reply address') + '>',
      template ? 'Template: ' + template : '',
      'Sent via CampMail on binasoy.kim · country ' + (req.headers.get('cf-ipcountry') ?? '?'),
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n'),
  });
  await env.MAILER.send(new EmailMessage(env.CONTACT_FROM, env.CONTACT_TO, mime));
  return json(200, { ok: true });
}

/** Strip anything that could start a new header line. */
const clean = (s: string) => s.replace(/[\r\n\u0000-\u001f\u007f]+/g, ' ').trim();
const b64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};
const encWord = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : '=?UTF-8?B?' + b64(s) + '?=');

export function buildMime(m: { from: string; to: string; replyTo?: string; subject: string; text: string }) {
  const body = b64(m.text.replace(/\r?\n/g, '\r\n')).replace(/.{1,76}/g, '$&\r\n');
  const domain = m.from.split('@')[1] ?? 'localhost';
  const h = [
    'From: "CampMail" <' + clean(m.from) + '>',
    'To: <' + clean(m.to) + '>',
    m.replyTo ? 'Reply-To: <' + clean(m.replyTo) + '>' : '',
    'Subject: ' + encWord(clean(m.subject)),
    'Date: ' + new Date().toUTCString(),
    'Message-ID: <' + crypto.randomUUID() + '@' + domain + '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
  ].filter(Boolean);
  return h.join('\r\n') + '\r\n\r\n' + body;
}
