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

/* === WIRE JS === */
const API_BASE = 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('tariqi_token');
}

function getUser() {
  const user = localStorage.getItem('tariqi_user');
  return user ? JSON.parse(user) : null;
}

function saveSession(token, user) {
  // localStorage is acceptable for this stage; httpOnly cookies are safer in production.
  localStorage.setItem('tariqi_token', token);
  localStorage.setItem('tariqi_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('tariqi_token');
  localStorage.removeItem('tariqi_user');
}

function updateNavForUser(user) {
  const actions = document.querySelector('.nav-actions');
  if (!actions || !user) return;

  const firstName = String(user.name || '').trim().split(' ')[0] || 'voyageur';

  actions.innerHTML = `
    <span class="nav-user-greeting">
      Bonjour, ${firstName}
    </span>
    <button class="btn-filled" id="btn-propose" type="button">
      Proposer un trajet
    </button>
    <button class="btn-outline" id="btn-logout" type="button">
      Se déconnecter
    </button>
  `;

  const logoutButton = document.getElementById('btn-logout');
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }
}

function resetNav() {
  const actions = document.querySelector('.nav-actions');
  if (!actions) return;

  actions.innerHTML = `
    <button class="btn-outline" id="btn-login" type="button">
      Se connecter
    </button>
    <button class="btn-filled" id="btn-propose" type="button">
      Proposer un trajet
    </button>
  `;

  const loginButton = document.getElementById('btn-login');
  if (loginButton) {
    loginButton.addEventListener('click', () => openAuthModal('login'));
  }
}

let sessionChecked = false;

async function restoreSessionOnLoad() {
  if (sessionChecked) return;
  sessionChecked = true;

  const token = getToken();

  if (!token) {
    resetNav();
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      updateNavForUser(data.user || getUser());
      return;
    }

    clearSession();
    resetNav();
  } catch (error) {
    console.error('Session restore error:', error);
    resetNav();
  }
}

function bindSessionRestore() {
  document.addEventListener(
    'DOMContentLoaded',
    async () => {
      await restoreSessionOnLoad();
    },
    { once: true }
  );

  if (document.readyState !== 'loading') {
    void restoreSessionOnLoad();
  }
}

function bindSearch() {
  const searchBar = document.getElementById('search-bar');
  const searchButton = searchBar ? searchBar.querySelector('.search-submit') : null;
  const panel = document.getElementById('search-results');

  if (panel) {
    panel.hidden = true;
    const closeButton = panel.querySelector('.results-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        panel.hidden = true;
      });
    }
  }

  if (searchBar && searchBar.tagName.toLowerCase() === 'form') {
    searchBar.addEventListener('submit', async (event) => {
      event.preventDefault();
      await performSearch();
    });
  }

  if (searchButton) {
    searchButton.addEventListener('click', async () => {
      await performSearch();
    });
  }

  if (searchBar && searchBar.tagName.toLowerCase() !== 'form') {
    searchBar.querySelectorAll('input, select').forEach((field) => {
      field.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          await performSearch();
        }
      });
    });
  }
}

async function performSearch() {
  const from = document.getElementById('input-depart').value.trim();
  const to = document.getElementById('input-destination').value.trim();
  const date = document.getElementById('input-date').value;
  const seats = document.getElementById('input-passagers').value;

  showResultsLoading();

  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  if (date) params.append('date', date);

  try {
    const queryString = params.toString();
    const response = await fetch(
      `${API_BASE}/trips${queryString ? `?${queryString}` : ''}`
    );

    if (!response.ok) {
      throw new Error(`Search failed (${response.status})`);
    }

    const trips = await response.json();
    const wantedSeats = Number.parseInt(seats, 10) || 1;

    const filtered = Array.isArray(trips)
      ? trips.filter((trip) => Number(trip.seats_available) >= wantedSeats)
      : [];

    renderResults(filtered, { from, to, date });
  } catch (error) {
    console.error('Search error:', error);
    showResultsError();
  }
}

function renderResults(trips) {
  const panel = document.getElementById('search-results');
  if (!panel) return;

  const grid = panel.querySelector('.results-grid');
  const empty = panel.querySelector('.results-empty');
  const loading = panel.querySelector('.results-loading');
  const countEl = panel.querySelector('.results-count');

  loading.hidden = true;
  panel.hidden = false;

  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (trips.length === 0) {
    grid.innerHTML = '';
    empty.hidden = false;
    countEl.textContent = '';
    return;
  }

  empty.hidden = true;
  countEl.textContent = `${trips.length} trajet${trips.length > 1 ? 's' : ''} trouvé${
    trips.length > 1 ? 's' : ''
  }`;

  grid.innerHTML = trips
    .map((trip) => {
      const driverName = trip.driver && trip.driver.name ? trip.driver.name : 'Conducteur';
      const seatsAvailable = Number(trip.seats_available) || 0;

      return `
      <article class="result-card" data-trip-id="${trip.id}">
        <div class="result-card-header">
          <div class="result-route">
            <span class="result-city">${trip.departure}</span>
            <span class="material-symbols-outlined result-arrow">
              arrow_forward
            </span>
            <span class="result-city">${trip.destination}</span>
          </div>
          <span class="result-price">${trip.price} DT</span>
        </div>
        <div class="result-card-body">
          <div class="result-meta">
            <span class="material-symbols-outlined">calendar_today</span>
            ${formatDate(trip.date)}
          </div>
          <div class="result-meta">
            <span class="material-symbols-outlined">schedule</span>
            ${trip.time}
          </div>
          <div class="result-meta">
            <span class="material-symbols-outlined">person</span>
            ${driverName}
          </div>
          <div class="result-meta">
            <span class="material-symbols-outlined">airline_seat_recline_normal</span>
            ${seatsAvailable} place${seatsAvailable > 1 ? 's' : ''} disponible${
        seatsAvailable > 1 ? 's' : ''
      }
          </div>
        </div>
        <button class="result-book-btn btn-filled"
                data-trip-id="${trip.id}"
                data-trip-price="${trip.price}"
                data-trip-route="${trip.departure} → ${trip.destination}">
          Réserver
        </button>
      </article>
    `;
    })
    .join('');

  grid.querySelectorAll('.result-book-btn').forEach((button) => {
    button.addEventListener('click', () => handleBooking(button));
  });
}

function formatDate(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('fr-TN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

function showResultsLoading() {
  const panel = document.getElementById('search-results');
  if (!panel) return;

  const loading = panel.querySelector('.results-loading');
  const grid = panel.querySelector('.results-grid');
  const empty = panel.querySelector('.results-empty');
  const countEl = panel.querySelector('.results-count');

  panel.hidden = false;
  loading.hidden = false;
  grid.innerHTML = '';
  empty.hidden = true;
  countEl.textContent = '';

  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showResultsError() {
  const panel = document.getElementById('search-results');
  if (!panel) return;

  panel.hidden = false;
  panel.querySelector('.results-loading').hidden = true;
  panel.querySelector('.results-empty').hidden = true;
  panel.querySelector('.results-grid').innerHTML = '';
  panel.querySelector('.results-count').textContent =
    'Erreur de connexion. Vérifiez que le serveur est démarré.';
}

async function handleBooking(button) {
  const tripId = button.dataset.tripId;
  const tripRoute = button.dataset.tripRoute;
  const tripPrice = button.dataset.tripPrice;

  if (!getToken()) {
    window._pendingBooking = { tripId, tripRoute, tripPrice };
    openAuthModal('login');
    return;
  }

  await confirmBooking(tripId, button);
}

async function confirmBooking(tripId, button) {
  button.disabled = true;
  button.textContent = 'Réservation...';

  try {
    const response = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        trip_id: Number.parseInt(tripId, 10),
        seats_booked: 1
      })
    });

    const data = await response.json();

    if (response.ok) {
      button.textContent = '✓ Réservé';
      button.style.background = 'var(--color-green)';
      button.disabled = true;
      showBookingSuccess(data);
      return;
    }

    button.disabled = false;
    button.textContent = 'Réserver';
    showBookingError(data.error || 'Erreur lors de la réservation');
  } catch (error) {
    console.error('Booking error:', error);
    button.disabled = false;
    button.textContent = 'Réserver';
    showBookingError('Erreur de connexion au serveur.');
  }
}

function mountBanner(type, message, timeoutMs) {
  const banner = document.createElement('div');
  banner.className =
    type === 'error' ? 'booking-banner booking-banner--error' : 'booking-banner';

  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined';
  icon.textContent = type === 'error' ? 'error' : 'check_circle';

  const text = document.createElement('span');
  text.textContent = message;

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Fermer la notification');

  const closeIcon = document.createElement('span');
  closeIcon.className = 'material-symbols-outlined';
  closeIcon.textContent = 'close';
  closeButton.appendChild(closeIcon);

  closeButton.addEventListener('click', () => banner.remove());

  banner.append(icon, text, closeButton);
  document.body.prepend(banner);

  setTimeout(() => {
    banner.remove();
  }, timeoutMs);
}

function showBookingSuccess(data) {
  if (!data || !data.trip) return;

  mountBanner(
    'success',
    `Réservation confirmée pour ${data.trip.departure} → ${data.trip.destination} le ${formatDate(
      data.trip.date
    )} à ${data.trip.time}.`,
    8000
  );
}

function showBookingError(message) {
  mountBanner('error', message || 'Une erreur est survenue.', 6000);
}

function openAuthModal(tab = 'login') {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  switchAuthTab(tab);
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;

  modal.hidden = true;
  document.body.style.overflow = '';

  const loginError = document.getElementById('login-error');
  const registerError = document.getElementById('register-error');
  if (loginError) loginError.hidden = true;
  if (registerError) registerError.hidden = true;
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((tabButton) => {
    tabButton.classList.toggle('active', tabButton.dataset.tab === tab);
  });

  const loginForm = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');

  if (loginForm) {
    loginForm.hidden = tab !== 'login';
  }

  if (registerForm) {
    registerForm.hidden = tab !== 'register';
  }
}

function setAuthError(element, message) {
  element.textContent = message;
  element.hidden = false;
}

async function completePendingBookingIfAny() {
  if (!window._pendingBooking) return;

  const { tripId } = window._pendingBooking;
  window._pendingBooking = null;

  const button = document.querySelector(`.result-book-btn[data-trip-id="${tripId}"]`);
  if (button) {
    await confirmBooking(tripId, button);
  }
}

function bindAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;

  const backdrop = modal.querySelector('.auth-modal-backdrop');
  const closeButton = modal.querySelector('.auth-modal-close');
  const loginSubmit = document.getElementById('login-submit');
  const registerSubmit = document.getElementById('register-submit');

  if (backdrop) {
    backdrop.addEventListener('click', closeAuthModal);
  }

  if (closeButton) {
    closeButton.addEventListener('click', closeAuthModal);
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) {
      closeAuthModal();
    }
  });

  document.querySelectorAll('.auth-tab').forEach((tabButton) => {
    tabButton.addEventListener('click', () => {
      switchAuthTab(tabButton.dataset.tab);
    });
  });

  if (loginSubmit) {
    loginSubmit.addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errorEl = document.getElementById('login-error');

      errorEl.hidden = true;

      if (!email || !password) {
        setAuthError(errorEl, 'Veuillez remplir tous les champs.');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (response.ok) {
          saveSession(data.token, data.user);
          updateNavForUser(data.user);
          closeAuthModal();
          await completePendingBookingIfAny();
          return;
        }

        setAuthError(errorEl, data.error || 'Impossible de se connecter.');
      } catch (error) {
        console.error('Auth login error:', error);
        setAuthError(errorEl, 'Erreur de connexion au serveur.');
      }
    });
  }

  if (registerSubmit) {
    registerSubmit.addEventListener('click', async () => {
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const password = document.getElementById('reg-password').value;
      const errorEl = document.getElementById('register-error');

      errorEl.hidden = true;

      if (!name || !email || !password) {
        setAuthError(errorEl, 'Veuillez remplir les champs obligatoires.');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, password })
        });
        const data = await response.json();

        if (response.ok) {
          saveSession(data.token, data.user);
          updateNavForUser(data.user);
          closeAuthModal();
          await completePendingBookingIfAny();
          return;
        }

        setAuthError(errorEl, data.error || 'Impossible de créer le compte.');
      } catch (error) {
        console.error('Auth register error:', error);
        setAuthError(errorEl, 'Erreur de connexion au serveur.');
      }
    });
  }
}

function logout() {
  clearSession();
  resetNav();

  window._pendingBooking = null;

  const resultsPanel = document.getElementById('search-results');
  if (resultsPanel) {
    resultsPanel.hidden = true;
  }
}

function initWireJS() {
  window._pendingBooking = null;
  bindSearch();
  bindAuthModal();
  bindSessionRestore();
}

async function bootstrap() {
  if (typeof window.loadAllComponents === 'function') {
    await window.loadAllComponents();
  }

  initHeader();
  initHero();
  initDestinations();
  initAnimations();
  initWireJS();
}

bootstrap();
