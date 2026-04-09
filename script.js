function initHeader() {
  const header = document.getElementById('site-header');
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');

  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 80);
    });
  }

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

function initHero() {
  const hero = document.getElementById('hero');
  const heroOverlay = hero ? hero.querySelector('.hero-overlay') : null;
  const heroVeil = hero ? hero.querySelector('.hero-top-veil') : null;
  const searchBar = document.getElementById('search-bar');

  if (hero && heroOverlay && searchBar) {
    window.addEventListener(
      'scroll',
      () => {
        const scrollY = window.scrollY;
        const heroHeight = hero.offsetHeight;
        const progress = Math.min(scrollY / heroHeight, 1);

        heroOverlay.style.opacity = String(Math.max(1 - progress * 1.4, 0.15));
        hero.style.backgroundPositionY = `calc(50% + ${scrollY * 0.4}px)`;

        if (progress > 0.28) {
          searchBar.classList.add('visible');
        } else {
          searchBar.classList.remove('visible');
        }

        if (heroVeil) {
          if (progress > 0.15) {
            heroVeil.classList.add('hidden');
          } else {
            heroVeil.classList.remove('hidden');
          }
        }
      },
      { passive: true }
    );
  }
}

function initDestinations() {
  const track = document.getElementById('dest-track');
  const prevBtn = document.getElementById('dest-prev');
  const nextBtn = document.getElementById('dest-next');
  const SCROLL_AMOUNT = 290;

  if (track && prevBtn && nextBtn) {
    prevBtn.addEventListener('click', () => {
      track.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
      track.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });
    });

    function updateArrows() {
      const atStart = track.scrollLeft <= 10;
      prevBtn.style.opacity = atStart ? '0.35' : '1';
      prevBtn.style.pointerEvents = atStart ? 'none' : 'all';

      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 10;
      nextBtn.style.opacity = atEnd ? '0.35' : '1';
      nextBtn.style.pointerEvents = atEnd ? 'none' : 'all';
    }

    track.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    updateArrows();
  }

  document.querySelectorAll('.dest-card').forEach((card) => {
    card.addEventListener('click', () => {
      const city = card.dataset.city;
      const destInput = document.getElementById('input-destination');
      const searchBarElement = document.getElementById('search-bar');

      if (destInput && city) {
        destInput.value = city;
        if (searchBarElement) {
          searchBarElement.classList.add('visible');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

window.initHeader = initHeader;
window.initHero = initHero;
window.initDestinations = initDestinations;

/* === ANIMATIONS JS === */
function countUp(el) {
  const target = parseInt(el.dataset.target, 10);
  if (Number.isNaN(target)) return;

  const duration = 1200;
  const step = 16;
  const increment = target / (duration / step);
  let current = 0;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      el.textContent = String(target);
      clearInterval(timer);
    } else {
      el.textContent = String(Math.floor(current));
    }
  }, step);
}

function initAnimations() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ratingsTrack = document.querySelector('.ratings-track');

  const destinationCards = document.querySelectorAll('.dest-card');
  destinationCards.forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.07}s`;
    card.classList.add('reveal');
  });

  if (prefersReducedMotion) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
    if (ratingsTrack) {
      ratingsTrack.classList.add('running');
    }
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (entry.target.classList.contains('reveal-group')) {
            entry.target.querySelectorAll('.reveal').forEach((el) => {
              el.classList.add('visible');
            });
          } else {
            entry.target.classList.add('visible');
          }

          if (entry.target.id === 'ratings' && ratingsTrack) {
            setTimeout(() => {
              ratingsTrack.classList.add('running');
            }, 700);
          }

          if (entry.target.id === 'about') {
            entry.target.querySelectorAll('.stat-number').forEach(countUp);
          }
        } else if (entry.boundingClientRect.top > 0) {
          if (entry.target.classList.contains('reveal-group')) {
            entry.target.querySelectorAll('.reveal').forEach((el) => {
              el.classList.remove('visible');
            });
          } else {
            entry.target.classList.remove('visible');
          }

          if (entry.target.id === 'ratings' && ratingsTrack) {
            ratingsTrack.classList.remove('running');
          }

          if (entry.target.id === 'about') {
            entry.target.querySelectorAll('.stat-number').forEach((el) => {
              el.textContent = '0';
            });
          }
        }
      });
    },
    {
      threshold: 0.08,
      rootMargin: '0px 0px -40px 0px'
    }
  );

  document.querySelectorAll('.reveal, .reveal-group').forEach((el) => {
    if (el.classList.contains('reveal')) {
      const parentGroup = el.closest('.reveal-group');
      if (parentGroup && parentGroup !== el) {
        return;
      }
    }

    revealObserver.observe(el);
  });
}

window.initAnimations = initAnimations;

async function bootstrap() {
  if (typeof window.loadAllComponents === 'function') {
    await window.loadAllComponents();
  }

  initHeader();
  initHero();
  initDestinations();
  initAnimations();
}

bootstrap();
