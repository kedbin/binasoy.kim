// ============================================
// binasoy.kim — Main Entry
// Lightweight, dependency-free interactivity.
// ============================================
import '/src/style/index.scss';

document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  const backToTop = document.querySelector('.back-to-top');

  // ---- Mobile menu ----
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const mobileOverlay = document.querySelector('.mobile-nav-overlay');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  const setMenu = (open) => {
    if (!menuBtn || !mobileOverlay) return;
    mobileOverlay.classList.toggle('open', open);
    mobileOverlay.setAttribute('aria-hidden', String(!open));
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };

  menuBtn?.addEventListener('click', () => {
    setMenu(!mobileOverlay.classList.contains('open'));
  });
  mobileLinks.forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenu(false);
  });

  // ---- Scroll-driven UI: sticky header shadow, back-to-top, active nav ----
  const navLinks = Array.from(document.querySelectorAll('.main-nav .nav-link[href^="#"]'));
  const sections = navLinks
    .map((l) => document.querySelector(l.getAttribute('href')))
    .filter(Boolean);

  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 8);
    if (backToTop) {
      const show = y > 600;
      backToTop.classList.toggle('is-visible', show);
      backToTop.hidden = !show;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Scroll-spy: highlight the nav item for the section in view
  if (sections.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = `#${entry.target.id}`;
          navLinks.forEach((l) =>
            l.classList.toggle('active', l.getAttribute('href') === id)
          );
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach((s) => spy.observe(s));
  }

  // ---- Reveal-on-scroll ----
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
    );
    reveals.forEach((el) => revealObserver.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  // ---- Footer year ----
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
});
