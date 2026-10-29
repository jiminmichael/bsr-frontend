/* =========================================================
   Brightstones Realty — main.js
   100% vanilla JavaScript (ES6). No frameworks.
   ========================================================= */
'use strict';

/* ---------- helpers ---------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* =========================================================
   1) PRELOADER — shows for exactly 3 seconds
   ========================================================= */
document.body.classList.add('is-loading');
const preloader = $('#preloader');

setTimeout(() => {
  if (!preloader) return;
  preloader.classList.add('done');
  document.body.classList.remove('is-loading');
  setTimeout(() => preloader.remove(), 700); // remove after fade-out
}, 3000);

/* =========================================================
   2) HEADER — transparent over hero, solid after scrolling
   ========================================================= */
const header = $('#siteHeader');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/* =========================================================
   3) SCROLLSPY — highlights desktop nav + mobile bottom nav
   ========================================================= */
const navLinks = $$('.nav-link, .bn-link');
const spy = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const id = entry.target.id;
    navLinks.forEach(link =>
      link.classList.toggle('active', link.getAttribute('href') === `#${id}`)
    );
  });
}, { rootMargin: '-40% 0px -55% 0px' });

// Observe sections only on single-page anchors if present
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
  ['home', 'about', 'projects', 'invest', 'contact'].forEach(id => {
    const section = document.getElementById(id);
    if (section) spy.observe(section);
  });
}

/* =========================================================
   4) STATS — count up from 0 when scrolled into view
   ========================================================= */
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

function runCounter(el) {
  const target = parseInt(el.dataset.target, 10) || 0;
  const suffix = el.dataset.suffix || '';
  const duration = 2200;
  const start = performance.now();

  const tick = now => {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(target * easeOutCubic(progress)).toLocaleString('en-US') + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const statIO = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      runCounter(entry.target);
      observer.unobserve(entry.target); // animate once only
    }
  });
}, { threshold: 0.5 });

$$('.stat-num').forEach(el => statIO.observe(el));

/* =========================================================
   5) PROPERTY CAROUSEL — arrow controls
   ========================================================= */
const carousel = $('#propertyCarousel');

$$('.car-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const firstCard = $('.prop-card', carousel);
    const step = firstCard ? firstCard.getBoundingClientRect().width + 24 : 340;
    const dir = btn.classList.contains('next') ? 1 : -1;
    carousel.scrollBy({ left: dir * step, behavior: 'smooth' });
  });
});

/* =========================================================
   6) RECENTLY VIEWED — localStorage implementation
   ========================================================= */
const RV_KEY = 'gh_recently_viewed';
const recentGrid = $('#recentGrid');
const clearBtn = $('#clearRecent');
const MAX_RECENT = 6;

const loadRecent = () => {
  try { return JSON.parse(localStorage.getItem(RV_KEY)) || []; }
  catch { return []; }
};

const saveRecent = list => {
  try { localStorage.setItem(RV_KEY, JSON.stringify(list)); }
  catch { /* storage unavailable (private mode) — fail silently */ }
};

function renderRecent() {
  if (!recentGrid) return;
  const items = loadRecent();

  if (clearBtn) clearBtn.hidden = items.length === 0;

  if (items.length === 0) {
    recentGrid.innerHTML = `
      <div class="recent-empty">
        <svg class="ic"><use href="#i-eye"/></svg>
        <strong>Nothing here yet</strong>
        <p>Tap &ldquo;View Details&rdquo; on any project below and it will be saved here automatically for your next visit.</p>
      </div>`;
    return;
  }

  recentGrid.innerHTML = items.map(p => `
    <div class="recent-card" data-id="${p.id}" title="Jump to this project" role="button" tabindex="0">
      <img src="${p.img}" alt="${p.name}">
      <div class="rc-body">
        <strong>${p.name}</strong>
        <span class="rc-loc">${p.loc}</span>
        <div class="rc-meta">
          <span class="rc-price">${p.price}</span>
          <span class="roi-chip roi-chip-sm">${p.roi} ROI</span>
        </div>
      </div>
    </div>`).join('');
}

function recordView(card) {
  const entry = {
    id:    card.dataset.id,
    name:  card.dataset.name,
    loc:   card.dataset.loc,
    price: card.dataset.price,
    roi:   card.dataset.roi,
    img:   card.dataset.img,
    ts:    Date.now()
  };

  // newest first, de-duplicated, capped at MAX_RECENT
  let items = loadRecent().filter(p => p.id !== entry.id);
  items.unshift(entry);
  items = items.slice(0, MAX_RECENT);

  saveRecent(items);
  renderRecent();
  showToast(`${entry.name} saved to Recently Viewed`);
}

// clicking anywhere on a property card records the view
$$('.prop-card').forEach(card => {
  card.addEventListener('click', () => recordView(card));
});

// clicking a "recently viewed" card jumps back to it in the carousel
function jumpToRecent(id) {
  const target = $(`.prop-card[data-id="${id}"]`);
  const projectsSection = $('#projects');
  if (!target || !projectsSection) return;
  projectsSection.scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => {
    target.classList.add('flash');
    setTimeout(() => target.classList.remove('flash'), 1800);
  }, 650);
}

recentGrid?.addEventListener('click', e => {
  const rc = e.target.closest('.recent-card');
  if (rc) jumpToRecent(rc.dataset.id);
});

recentGrid?.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const rc = e.target.closest('.recent-card');
  if (rc) { e.preventDefault(); jumpToRecent(rc.dataset.id); }
});

clearBtn?.addEventListener('click', () => {
  saveRecent([]);
  renderRecent();
  showToast('Recently viewed list cleared');
});

renderRecent();

/* =========================================================
   7) TOAST NOTIFICATION
   ========================================================= */
let toastTimer;

function showToast(message) {
  let toast = $('#toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = '<svg class="ic"><use href="#i-check"/></svg><span></span>';
    document.body.appendChild(toast);
  }
  $('span', toast).textContent = message;
  requestAnimationFrame(() => toast.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

/* =========================================================
   8) HERO VIDEO — graceful fallback if the source fails
      (page keeps its green gradient + poster image)
   ========================================================= */
const hero = $('.hero');
const heroVideo = $('.hero-video');

if (heroVideo) {
  const fail = () => {
    hero.classList.add('no-video');
    heroVideo.remove();
  };
  $$('source', heroVideo).forEach(src => src.addEventListener('error', fail));
  heroVideo.addEventListener('error', fail, true);
}
