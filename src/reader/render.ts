// OWNER: Sonnet task S3. Pure function: Content -> semantic HTML string (no React, no DOM APIs).
import type { Content } from '../content/types';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function renderReader(c: Content): string {
  return `<article class="reader-prose"><h1>${esc(c.profile.name)}</h1><p>${esc(c.profile.tagline)}</p></article>`;
}
