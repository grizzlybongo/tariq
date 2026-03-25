const header = document.getElementById("siteHeader");
const hero = document.getElementById("hero");
const carousel = document.getElementById("tripsCarousel");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");

const tripData = [
  {
    cover:
      "sousse.webp",
    depart: "Tunis",
    arrivee: "Sousse",
    prix: "12,00 DT",
    subroutes: [
      "Sousse depuis Sfax - 8,50 DT >",
      "Sousse depuis Kairouan - 6,20 DT >",
      "Sousse depuis Monastir - 4,50 DT >",
      "Sousse depuis Nabeul - 9,10 DT >"
    ]
  },
  {
    cover:
      "sfax.jpg",
    depart: "Sousse",
    arrivee: "Sfax",
    prix: "8,50 DT",
    subroutes: [
      "Sfax depuis Mahdia - 5,00 DT >",
      "Sfax depuis Sidi Bouzid - 7,60 DT >",
      "Sfax depuis Gabes - 9,00 DT >",
      "Sfax depuis Djerba - 15,00 DT >"
    ]
  },
  {
    cover:
      "bizerte.jpg",
    depart: "Tunis",
    arrivee: "Bizerte",
    prix: "7,00 DT",
    subroutes: [
      "Bizerte depuis Nabeul - 7,40 DT >",
      "Bizerte depuis Beja - 6,70 DT >",
      "Bizerte depuis Menzel Bourguiba - 3,80 DT >"
    ]
  },
  {
    cover:
      "gabes.jpg",
    depart: "Sfax",
    arrivee: "Gabes",
    prix: "9,00 DT",
    subroutes: [
      "Gabes depuis Gafsa - 7,50 DT >",
      "Gabes depuis Medenine - 6,30 DT >",
      "Gabes depuis Tataouine - 9,90 DT >"
    ]
  },
  {
    cover:
      "tunis.jpeg",
    depart: "Kairouan",
    arrivee: "Tunis",
    prix: "10,50 DT",
    subroutes: [
      "Tunis depuis Sousse - 12,00 DT >",
      "Tunis depuis Zaghouan - 5,20 DT >",
      "Tunis depuis Bizerte - 7,00 DT >",
      "Tunis depuis Nabeul - 8,00 DT >"
    ]
  },
  {
    cover:
      "sfax.jpg",
    depart: "Djerba",
    arrivee: "Sfax",
    prix: "15,00 DT",
    subroutes: [
      "Sfax depuis Zarzis - 11,80 DT >",
      "Sfax depuis Medenine - 10,90 DT >",
      "Sfax depuis Gabes - 9,00 DT >",
      "Sfax depuis Skhira - 6,40 DT >"
    ]
  }
];

const renderTrips = () => {
  const cards = tripData
    .map((trip) => {
      const links = trip.subroutes
        .map((item) => `<a href="#">${item}</a>`)
        .join("");

      return `
        <article class="trip-card">
          <img class="trip-cover" src="${trip.cover}" alt="${trip.arrivee}" />
          <div class="trip-body">
            <div class="trip-route">
              <div class="route-line"><span></span></div>
              <div class="route-labels">
                <p>${trip.depart}</p>
                <p>${trip.arrivee}</p>
              </div>
            </div>
            <div class="trip-price-row">
              <p class="trip-price">Des <strong>${trip.prix}</strong></p>
              <button class="arrow-pill" aria-label="Voir les details">→</button>
            </div>
            <div class="trip-links">${links}</div>
          </div>
        </article>
      `;
    })
    .join("");

  carousel.innerHTML = cards;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const handleScrollEffects = () => {
  const scrollY = window.scrollY;
  header.classList.toggle("scrolled", scrollY > 14);

  const heroRect = hero.getBoundingClientRect();
  const heroTopInPage = scrollY + heroRect.top;
  const progress = clamp((scrollY - heroTopInPage + 90) / (hero.offsetHeight * 0.72), 0, 1);
  hero.style.setProperty("--hero-bg-opacity", progress.toFixed(3));
};

const moveCarousel = (direction) => {
  const card = carousel.querySelector(".trip-card");
  if (!card) return;

  const gap = 16;
  const amount = card.offsetWidth + gap;
  carousel.scrollBy({
    left: direction * amount,
    behavior: "smooth"
  });
};

mobileMenuBtn.addEventListener("click", () => {
  mobileMenu.classList.toggle("open");
});

window.addEventListener("scroll", handleScrollEffects, { passive: true });
prevBtn.addEventListener("click", () => moveCarousel(-1));
nextBtn.addEventListener("click", () => moveCarousel(1));

renderTrips();
handleScrollEffects();
