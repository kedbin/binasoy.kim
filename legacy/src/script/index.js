// ============================================
// binasoy.kim — Main Entry
// Lightweight, dependency-free interactivity.
// Every effect degrades gracefully: respects prefers-reduced-motion,
// pauses when off-screen, and leaves content fully visible without JS.
// ============================================
import '/src/style/index.scss';

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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

  // ---- Scroll-driven UI ----
  const navLinks = Array.from(document.querySelectorAll('.main-nav .nav-link[href^="#"]'));
  const sections = navLinks.map((l) => document.querySelector(l.getAttribute('href'))).filter(Boolean);
  const progressBar = document.querySelector('.scroll-progress > span');

  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 8);
    if (backToTop) {
      const show = y > 600;
      backToTop.classList.toggle('is-visible', show);
      backToTop.hidden = !show;
    }
    if (progressBar) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const pct = h > 0 ? Math.min(1, y / h) : 0;
      progressBar.style.transform = `scaleX(${pct})`;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  if (sections.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = `#${entry.target.id}`;
          navLinks.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === id));
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach((s) => spy.observe(s));
  }

  // ---- Reveal-on-scroll (transform-only: content always visible) ----
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !prefersReducedMotion()) {
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

  // ---- Animated stat counters (count-up on reveal) ----
  const counters = document.querySelectorAll('[data-count]');
  const animateCounter = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (prefersReducedMotion()) {
      el.textContent = `${target}${suffix}`;
      return;
    }
    const duration = 1100;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      el.textContent = `${Math.round(target * eased)}${suffix}`;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = `${target}${suffix}`;
    };
    requestAnimationFrame(step);
  };
  if (counters.length && 'IntersectionObserver' in window) {
    const cObs = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((c) => cObs.observe(c));
  } else {
    counters.forEach((c) => animateCounter(c));
  }

  // ---- Card tilt micro-interaction (fine pointers only, motion allowed) ----
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  if (finePointer && !prefersReducedMotion()) {
    document.querySelectorAll('.cert-card, .timeline-card').forEach((card) => {
      const MAX = 5; // degrees
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(800px) rotateX(${(-py * MAX).toFixed(2)}deg) rotateY(${(px * MAX).toFixed(2)}deg) translateY(-3px)`;
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
      });
    });
  }

  // ---- Canvas particle "network" hero accent ----
  // 2D canvas (no WebGL) => tiny weight, runs anywhere, no dGPU risk.
  // Capped FPS, paused when hero off-screen, skipped entirely under reduced-motion.
  const canvas = document.querySelector('.hero-canvas');
  const heroSection = document.querySelector('.hero');
  if (canvas && heroSection && canvas.getContext && !prefersReducedMotion()) {
    const ctx = canvas.getContext('2d');
    let width = 0, height = 0, particles = [], raf = null, lastFrame = 0, visible = true;
    const FPS = 30;
    const FRAME_MS = 1000 / FPS;
    const COLORS = ['rgba(111,174,141,', 'rgba(126,151,184,', 'rgba(200,169,107,'];

    const buildParticles = () => {
      const area = width * height;
      const count = Math.min(46, Math.max(14, Math.round(area / 26000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: 1 + Math.random() * 1.6,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    };

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const rect = heroSection.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      buildParticles();
    };

    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      if (now - lastFrame < FRAME_MS) return;
      lastFrame = now;
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      }
      // connecting lines between near particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 14000) {
            const alpha = (1 - d2 / 14000) * 0.16;
            ctx.strokeStyle = `rgba(111,174,141,${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const p of particles) {
        ctx.fillStyle = `${p.c}0.55)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const start = () => { if (!raf) { lastFrame = 0; raf = requestAnimationFrame(draw); } };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = null; } };

    resize();
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    });

    // Pause when the hero scrolls out of view (saves CPU/battery).
    if ('IntersectionObserver' in window) {
      const visObs = new IntersectionObserver(
        (entries) => {
          visible = entries[0].isIntersecting;
          if (visible) start(); else stop();
        },
        { threshold: 0 }
      );
      visObs.observe(heroSection);
    } else {
      start();
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else if (visible) start();
    });
  }

  // ---- Hero "automation orbit" (replaces the portrait) ----
  const orbitCanvas = document.querySelector('.orbit-canvas');
  const orbitStage = document.querySelector('.orbit-stage');
  if (orbitCanvas && orbitStage && orbitCanvas.getContext) {
    const octx = orbitCanvas.getContext('2d');
    let ow = 0, oh = 0, oraf = null, olast = 0, ovisible = true;
    const OFPS = 30, OFRAME = 1000 / OFPS;
    const NODES = [
      { label: 'Azure', color: '#5BA2E0', rad: 0.60, speed: 0.00038, phase: 0 },
      { label: 'GCP', color: '#6FAE8D', rad: 0.60, speed: 0.00038, phase: Math.PI * 0.5 },
      { label: 'AWS', color: '#C8A96B', rad: 0.60, speed: 0.00038, phase: Math.PI },
      { label: 'CI/CD', color: '#7E97B8', rad: 0.60, speed: 0.00038, phase: Math.PI * 1.5 },
      { label: 'AI', color: '#B58FE0', rad: 0.40, speed: -0.00060, phase: 0.7 },
    ];

    const oresize = () => {
      const ratio = window.devicePixelRatio || 1;
      const rect = orbitStage.getBoundingClientRect();
      ow = Math.max(1, Math.floor(rect.width));
      oh = Math.max(1, Math.floor(rect.height));
      orbitCanvas.width = Math.floor(ow * ratio);
      orbitCanvas.height = Math.floor(oh * ratio);
      orbitCanvas.style.width = ow + 'px';
      orbitCanvas.style.height = oh + 'px';
      octx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const drawOrbit = (t) => {
      const cx = ow / 2, cy = oh / 2;
      const R = Math.min(ow, oh) / 2;
      octx.clearRect(0, 0, ow, oh);
      // rings
      octx.strokeStyle = 'rgba(35,42,51,0.9)';
      octx.lineWidth = 1;
      [0.60, 0.40].forEach((f) => {
        octx.beginPath();
        octx.arc(cx, cy, R * f, 0, Math.PI * 2); octx.stroke();
      });
      NODES.forEach((n) => {
        const ang = n.phase + t * n.speed;
        const nx = cx + R * n.rad * Math.cos(ang);
        const ny = cy + R * n.rad * Math.sin(ang);
        // link
        octx.strokeStyle = 'rgba(111,174,141,0.18)';
        octx.lineWidth = 1;
        octx.beginPath(); octx.moveTo(cx, cy); octx.lineTo(nx, ny); octx.stroke();
        // traveling pulse
        const p = ((t * 0.0009 + n.phase * 0.2) % 1);
        octx.fillStyle = n.color + 'cc';
        octx.beginPath(); octx.arc(cx + (nx - cx) * p, cy + (ny - cy) * p, 2.2, 0, Math.PI * 2); octx.fill();
        // node
        octx.fillStyle = n.color;
        octx.shadowColor = n.color;
        octx.shadowBlur = 10;
        octx.beginPath(); octx.arc(nx, ny, 5, 0, Math.PI * 2); octx.fill();
        octx.shadowBlur = 0;
        // label
        octx.fillStyle = 'rgba(174,182,192,0.92)';
        octx.font = '500 11px "JetBrains Mono", monospace';
        octx.textAlign = Math.cos(ang) >= 0 ? 'left' : 'right';
        octx.textBaseline = 'middle';
        octx.fillText(n.label, nx + Math.cos(ang) * 13, ny + Math.sin(ang) * 13);
      });
    };

    const oloop = (now) => { oraf = requestAnimationFrame(oloop); if (now - olast < OFRAME) return; olast = now; drawOrbit(now); };
    const ostart = () => { if (!oraf) { olast = 0; oraf = requestAnimationFrame(oloop); } };
    const ostop = () => { if (oraf) { cancelAnimationFrame(oraf); oraf = null; } };
    const oReduced = prefersReducedMotion();

    oresize();
    let oresizeTimer;
    window.addEventListener('resize', () => { clearTimeout(oresizeTimer); oresizeTimer = setTimeout(oresize, 200); });

    if (oReduced) {
      drawOrbit(0); // static frame
    } else if ('IntersectionObserver' in window) {
      const oObs = new IntersectionObserver((entries) => {
        ovisible = entries[0].isIntersecting;
        if (ovisible) ostart(); else ostop();
      }, { threshold: 0 });
      oObs.observe(orbitStage);
    } else {
      ostart();
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) ostop(); else if (ovisible && !oReduced) ostart();
    });
  }

  // ---- Typing terminal (on-brand automation showcase) ----
  const termOut = document.getElementById('terminal-output');
  if (termOut) {
    const COMMANDS = [
      { cmd: 'terraform plan', lines: [
        { t: 'Acquiring state lock… OK', c: 'muted' },
        { t: 'Plan: 12 to add, 0 to change, 0 to destroy.', c: 'out' },
        { t: '✓ Infrastructure drift-free', c: 'ok' },
      ]},
      { cmd: 'playwright test --reporter=line', lines: [
        { t: 'Running 42 tests across 3 projects…', c: 'muted' },
        { t: '  42 passed (8.4s)', c: 'out' },
        { t: '✓ All green — shipping', c: 'ok' },
      ]},
      { cmd: 'gh run list --limit 3', lines: [
        { t: '✓ deploy.yml  success  main  2m03s', c: 'ok' },
        { t: '✓ test.yml   success  main  1m12s', c: 'ok' },
        { t: '✓ build.yml  success  main  0m54s', c: 'ok' },
      ]},
    ];

    const prompt = '<span class="t-prompt">➜</span> <span class="t-cwd">~/kim</span> ';

    const renderStatic = () => {
      const c = COMMANDS[0];
      termOut.innerHTML = `${prompt}<span class="t-cmd">${c.cmd}</span>\n` +
        c.lines.map((l) => `<span class="t-${l.c}">${l.t}</span>`).join('\n');
    };

    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      renderStatic();
    } else {
      // Show fallback content immediately so the terminal is never an empty
      // void before the typing animation triggers on scroll into view.
      renderStatic();
      let cancelled = false;
      let inView = false;
      const typeRun = async () => {
        for (let i = 0; !cancelled; i = (i + 1) % COMMANDS.length) {
          const c = COMMANDS[i];
          // type the command
          let typed = '';
          termOut.innerHTML = prompt + '<span class="t-cmd"></span>';
          const cmdEl = termOut.querySelector('.t-cmd');
          for (const ch of c.cmd) {
            if (cancelled || !inView) return;
            typed += ch;
            cmdEl.textContent = typed;
            await wait(46 + Math.random() * 40);
          }
          await wait(260);
          // reveal output lines
          let html = `${prompt}<span class="t-cmd">${c.cmd}</span>\n`;
          const built = [];
          for (const l of c.lines) {
            if (cancelled || !inView) return;
            built.push(`<span class="t-${l.c}">${l.t}</span>`);
            termOut.innerHTML = html + built.join('\n');
            await wait(240);
          }
          await wait(1900);
        }
      };
      const termObs = new IntersectionObserver(
        (entries) => {
          inView = entries[0].isIntersecting;
          if (inView) typeRun().catch(() => {});
        },
        { threshold: 0.2 }
      );
      termObs.observe(termOut);
    }
  }

  // ---- Footer year ----
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
});
