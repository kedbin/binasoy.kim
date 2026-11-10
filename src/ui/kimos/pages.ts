// Shared Trailhead page table (used by KimOS, Trailhead and Terminal).
export type PageId = 'home' | 'about' | 'experience' | 'projects' | 'certs' | 'resume';
export interface PageDef { id: PageId; label: string; glyph: string; path: string }

/** Trail order: these are the bookmarks; 'home' is the new-tab page. */
export const PAGES: PageDef[] = [
  { id: 'about', label: 'About', glyph: '🏕', path: 'about' },
  { id: 'experience', label: 'Experience', glyph: '🥾', path: 'experience' },
  { id: 'projects', label: 'Projects', glyph: '🛠️', path: 'projects' },
  { id: 'certs', label: 'Certs & Skills', glyph: '🏅', path: 'certs-and-skills' },
  { id: 'resume', label: 'Résumé', glyph: '📎', path: 'resume' },
];
export const HOME: PageDef = { id: 'home', label: 'New tab', glyph: '🧭', path: '' };
export const pageOf = (id: PageId): PageDef => (id === 'home' ? HOME : PAGES.find((p) => p.id === id)!);

/** Loose name → page lookup for the address bar and the terminal. */
const ALIASES: Record<string, PageId> = {
  home: 'home', start: 'home', newtab: 'home', trailhead: 'home',
  about: 'about', me: 'about', kim: 'about',
  experience: 'experience', exp: 'experience', work: 'experience', jobs: 'experience', trail: 'experience',
  projects: 'projects', project: 'projects',
  certs: 'certs', cert: 'certs', certifications: 'certs', skills: 'certs', badges: 'certs', 'certs-and-skills': 'certs',
  resume: 'resume', 'résumé': 'resume', cv: 'resume', pdf: 'resume',
};
export function resolvePage(raw: string): PageId | null {
  const s = raw.trim().toLowerCase().replace(/^trail:\/\/kim\/?/, '').replace(/^\/+|\/+$/g, '').replace(/\.(txt|pdf|html)$/, '');
  if (s === '') return 'home';
  return ALIASES[s] ?? null;
}
