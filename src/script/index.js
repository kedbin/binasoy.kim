// ============================================
// kedbin.ca — Main Entry
// ============================================
import '/src/style/index.scss';

document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const mobileOverlay = document.querySelector('.mobile-nav-overlay');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  if (menuBtn && mobileOverlay) {
    menuBtn.addEventListener('click', () => {
      const isOpen = mobileOverlay.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileOverlay.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // Sliding content stage
  const stageTrack = document.querySelector('.stage-track');
  const stagePrev = document.querySelector('.stage-prev');
  const stageNext = document.querySelector('.stage-next');
  const stageCount = document.querySelector('.stage-count');
  const stageLabel = document.querySelector('.stage-label');

  if (stageTrack && stagePrev && stageNext && stageCount && stageLabel) {
    const labels = ['Highlights', 'Experience'];
    let stageIndex = 0;

    const renderStage = () => {
      stageTrack.setAttribute('data-stage-index', String(stageIndex));
      stagePrev.disabled = stageIndex === 0;
      stageNext.disabled = stageIndex === 1;
      stageCount.textContent = `${String(stageIndex + 1).padStart(2, '0')} / 02`;
      stageLabel.textContent = labels[stageIndex];
    };

    stagePrev.addEventListener('click', () => {
      if (stageIndex > 0) {
        stageIndex -= 1;
        renderStage();
      }
    });

    stageNext.addEventListener('click', () => {
      if (stageIndex < 1) {
        stageIndex += 1;
        renderStage();
      }
    });

    renderStage();
  }

  // Subtle matrix-style ambient hover field
  const heroSlide = document.querySelector('.stage-slide-hero');
  const heroCanvas = document.querySelector('.hero-matrix-canvas');

  if (heroSlide && heroCanvas && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    const ctx = heroCanvas.getContext('2d');

    if (ctx) {
      const glyphs = ['0', '1', '+', '×', '<', '>', '/', '{', '}', '∑', 'λ', '::'];
      let width = 0;
      let height = 0;
      let animationFrame = null;
      let time = 0;
      let pointer = { x: 0, y: 0, active: false };
      let nodes = [];

      const createNodes = () => {
        const cols = Math.max(5, Math.floor(width / 140));
        const rows = Math.max(5, Math.floor(height / 90));
        nodes = [];

        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            const zoneBias = col / Math.max(1, cols - 1);
            if (zoneBias < 0.38) continue;

            nodes.push({
              x: (col + 0.5) * (width / cols) + (Math.random() - 0.5) * 24,
              y: (row + 0.5) * (height / rows) + (Math.random() - 0.5) * 20,
              char: glyphs[Math.floor(Math.random() * glyphs.length)],
              size: 12 + Math.random() * 6,
              drift: Math.random() * Math.PI * 2,
              strength: 0.35 + Math.random() * 0.65,
              hue: Math.random() > 0.78 ? 'amber' : Math.random() > 0.5 ? 'slate' : 'emerald'
            });
          }
        }
      };

      const resize = () => {
        const rect = heroSlide.getBoundingClientRect();
        width = Math.max(1, Math.floor(rect.width));
        height = Math.max(1, Math.floor(rect.height));
        const ratio = window.devicePixelRatio || 1;
        heroCanvas.width = Math.floor(width * ratio);
        heroCanvas.height = Math.floor(height * ratio);
        heroCanvas.style.width = `${width}px`;
        heroCanvas.style.height = `${height}px`;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        createNodes();
      };

      const draw = () => {
        time += 0.012;
        ctx.clearRect(0, 0, width, height);

        nodes.forEach((node) => {
          const dx = pointer.x - node.x;
          const dy = pointer.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const influence = pointer.active ? Math.max(0, 1 - distance / 180) : 0;
          const wave = Math.sin(time * 2.4 + node.drift + node.y * 0.018) * 4.5;
          const liftX = pointer.active ? -dx * influence * 0.06 : 0;
          const liftY = pointer.active ? -dy * influence * 0.045 : 0;
          const x = node.x + wave + liftX;
          const y = node.y + Math.cos(time * 1.8 + node.drift) * 2.5 + liftY;
          const alpha = 0.09 + influence * 0.42 * node.strength;

          let color = 'rgba(111, 174, 141,';
          if (node.hue === 'amber') color = 'rgba(200, 169, 107,';
          if (node.hue === 'slate') color = 'rgba(126, 151, 184,';

          ctx.font = `${node.size + influence * 3}px JetBrains Mono, monospace`;
          ctx.fillStyle = `${color}${alpha})`;
          ctx.fillText(node.char, x, y);

          if (influence > 0.18) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(111, 174, 141, ${0.05 + influence * 0.08})`;
            ctx.lineWidth = 1;
            ctx.moveTo(x - 10, y + 10);
            ctx.quadraticCurveTo(x + 10, y + 2, x + 22, y + 16);
            ctx.stroke();
          }
        });

        animationFrame = window.requestAnimationFrame(draw);
      };

      heroSlide.addEventListener('pointermove', (event) => {
        const rect = heroSlide.getBoundingClientRect();
        pointer = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          active: true
        };
      });

      heroSlide.addEventListener('pointerleave', () => {
        pointer.active = false;
      });

      const resizeObserver = new ResizeObserver(() => resize());
      resizeObserver.observe(heroSlide);
      resize();
      draw();

      window.addEventListener('beforeunload', () => {
        if (animationFrame) window.cancelAnimationFrame(animationFrame);
        resizeObserver.disconnect();
      });
    }
  }
});
