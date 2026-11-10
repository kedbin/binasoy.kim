// Client for the same-origin Cloudflare Worker contact endpoint. The recipient is fixed server-side:
// never send a "to" field from here.
export const CONTACT_ENDPOINT = '/api/contact';

export type TemplateId = 'work' | 'cloud' | 'van' | 'feedback' | 'other';

export interface ContactPayload {
  message: string;          // 1..5000
  subject?: string;         // <= 200
  email?: string;           // optional reply-to
  name?: string;            // <= 100
  template?: TemplateId;
  trap: string;             // honeypot, must be ""
  mountedAt: number;        // Date.now() when the compose window opened
  turnstileToken: string;   // '' when no site key is configured (server answers 'captcha')
}

export const LIMITS = { message: 5000, subject: 200, name: 100, email: 254 } as const;
/** Same shape check as worker/index.ts, so we catch typos before a round-trip. */
export const EMAIL_RE = /^[^\s@<>()",;:]{1,64}@[^\s@<>()",;:]{1,190}\.[a-z]{2,24}$/i;
/** Failures where the visitor should be offered the mail-app / copy fallback. */
export const NEEDS_FALLBACK: FailReason[] = ['unavailable', 'captcha'];

/** 'unavailable' = no API on this host (404/405 or non-JSON reply), e.g. plain `vite preview`. */
export type FailReason = 'invalid' | 'captcha' | 'refused' | 'busy' | 'server' | 'offline' | 'hasty' | 'unavailable';
export type ContactResult = { ok: true } | { ok: false; reason: FailReason };

const SERVER_REASONS: FailReason[] = ['invalid', 'captcha', 'refused', 'busy', 'server'];

function byStatus(status: number): FailReason {
  if (status === 404 || status === 405) return 'unavailable';
  if (status === 400) return 'invalid';
  if (status === 429) return 'busy';
  if (status >= 500) return 'server';
  return 'refused';
}

export async function postContact(payload: ContactPayload, signal?: AbortSignal): Promise<ContactResult> {
  let res: Response;
  try {
    res = await fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
      signal,
    });
  } catch {
    return { ok: false, reason: 'offline' };
  }
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  let body: { ok?: boolean; reason?: string } | null = null;
  if (isJson) { try { body = await res.json(); } catch { body = null; } }
  if (res.ok) {
    // A 200 that isn't our JSON (e.g. an SPA fallback page) means there's no worker here.
    if (!body) return { ok: false, reason: 'unavailable' };
    return body.ok === false ? { ok: false, reason: 'refused' } : { ok: true };
  }
  if (res.status === 404 || res.status === 405) return { ok: false, reason: 'unavailable' };
  const r = body?.reason as FailReason | undefined;
  return { ok: false, reason: r && SERVER_REASONS.includes(r) ? r : byStatus(res.status) };
}

/** A refusal within 3 s of opening the window is almost certainly the server's anti-bot timer. */
export const HASTY_MS = 3000;
export function classify(reason: FailReason, msSinceOpen: number): FailReason {
  return reason === 'refused' && msSinceOpen < HASTY_MS ? 'hasty' : reason;
}

export const FAIL_COPY: Record<FailReason, { title: string; body: string }> = {
  busy: { title: 'The mailbox is swamped', body: 'Too many notes landed at once. Give it a minute by the fire and try again.' },
  hasty: { title: 'That was quick!', body: 'It went out within a couple of seconds of opening, which looks a lot like a bot. Take a breath and send it again — it should go through.' },
  refused: { title: 'The mailbox turned it away', body: "It didn't say why (and it won't tell the bots either). Try again, or use the address below." },
  captcha: { title: "the bot-check didn't finish", body: 'Cloudflare couldn\u2019t confirm you\u2019re a human camper. Give it another go (tick the box if one appears), or send it from your own email:' },
  invalid: { title: 'Something in the note looks off', body: 'Check the reply address and keep the note under 5,000 characters, then try again.' },
  server: { title: 'Something broke on my end', body: 'Not your fault — the camp mailbox tripped over a tent peg. Try again in a minute.' },
  offline: { title: 'No signal out here', body: 'Nothing came back at all. Check your connection and try again once you\u2019re back in range.' },
  unavailable: { title: "The camp mailbox isn't set up here", body: "This copy of the site has no mail server, so the note can't be sent from the laptop. Send it from your own email instead:" },
};
