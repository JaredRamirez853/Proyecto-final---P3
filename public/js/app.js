const state = { games: [] };

const catalog = document.getElementById("catalog");
const pageGames = document.getElementById("pageGames");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");

function gameImage(game) {
  return game.custom_image_url || game.image_url || "https://placehold.co/600x800/0f172a/eff6ff?text=GameHub";
}

function formatDate(value) {
  if (!value) return "Fecha por confirmar";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-DO", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function gameCard(game, upcoming = false) {
  return `
    <article class="card ${upcoming ? "upcoming" : ""}" data-id="${game.id}">
      <img src="${gameImage(game)}" alt="${escapeHtml(game.title)}" loading="lazy">
      <div class="card-body">
        <div class="card-title-row"><h3>${escapeHtml(game.title)}</h3>${game.rating ? `<span class="rating">★ ${Number(game.rating).toFixed(1)}</span>` : ""}</div>
        <p>${formatDate(game.release_date)}</p>
        ${game.is_on_sale ? `<span class="sale-badge">-${Number(game.discount_percent || 0)}%</span>` : ""}
      </div>
    </article>`;
}

function renderGames(target, games, upcoming = false) {
  if (!target) return;
  target.innerHTML = games.length ? games.map((game) => gameCard(game, upcoming)).join("") : "<p>No hay juegos para mostrar.</p>";
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "No fue posible consultar la información.");
  }
  return response.json();
}

async function showGame(id) {
  const game = await getJson(`/api/games/${id}`);

  const stores = (game.stores || [])
    .map((store) => `
      <a
        class="store-link"
        href="${store.url}"
        target="_blank"
        rel="noopener noreferrer"
      >
        ${escapeHtml(store.name)}
      </a>
    `)
    .join("");

  const rating = game.rating
    ? `<span class="detail-rating">★ ${Number(game.rating).toFixed(1)}</span>`
    : "";

  const saleInfo = game.is_on_sale
    ? `
      <div class="sale-detail">
        <span class="sale-label">Oferta</span>
        <strong>-${Number(game.discount_percent || 0)}%</strong>
        ${
          game.original_price
            ? `<span class="old-price">$${Number(game.original_price).toFixed(2)}</span>`
            : ""
        }
        ${
          game.sale_price
            ? `<span class="sale-price">$${Number(game.sale_price).toFixed(2)}</span>`
            : ""
        }
      </div>
    `
    : "";

  modalContent.innerHTML = `
    <div class="detail">
      <div class="detail-image-wrapper">
        <img
          src="${gameImage(game)}"
          alt="${escapeHtml(game.title)}"
          class="detail-image"
        >
      </div>

      <div class="detail-content">
        <div class="detail-topline">
          <span class="eyebrow">
            ${escapeHtml(game.genre || "Videojuego")}
          </span>
          ${rating}
        </div>

        <h2>${escapeHtml(game.title)}</h2>

        <p class="detail-description">
          ${escapeHtml(game.description || "No hay una descripción disponible.")}
        </p>

        <div class="detail-info">
          <p>
            <strong>Lanzamiento:</strong>
            ${formatDate(game.release_date)}
          </p>

          <p>
            <strong>Plataforma:</strong>
            ${escapeHtml(game.platform || "PC")}
          </p>
        </div>

        ${saleInfo}

        <div class="stores-section">
          <h3>Disponible en</h3>
          <div class="stores-list">
            ${stores}
          </div>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
}

async function loadHome() {
  const [featured, recent, sales, upcoming] = await Promise.all([
    getJson("/api/games/featured"),
    getJson("/api/games/new"),
    getJson("/api/games/sales"),
    getJson("/api/games/upcoming")
  ]);

  renderGames(catalog, featured);
  const resultInfo = document.getElementById("resultInfo");
  if (resultInfo) resultInfo.textContent = `${featured.length} destacados`;

  renderGames(document.getElementById("homeNovedades"), recent.slice(0, 8));
  renderGames(document.getElementById("homeOfertas"), sales.slice(0, 8));
  renderGames(document.getElementById("homeProximamente"), upcoming.slice(0, 8), true);
}

async function loadSection(type) {
  const endpoint = { novedades: "/api/games/new", ofertas: "/api/games/sales", proximamente: "/api/games/upcoming" }[type];
  const games = await getJson(endpoint);
  state.games = games;
  renderGames(pageGames, games, type === "proximamente");
  const resultInfo = document.getElementById("resultInfo");
  if (resultInfo) resultInfo.textContent = `${games.length} juego(s)`;
}

function getCurrentPage() {
  const path = window.location.pathname.toLowerCase();
  if (path.endsWith("/novedades.html")) return "novedades";
  if (path.endsWith("/ofertas.html")) return "ofertas";
  if (path.endsWith("/proximamente.html")) return "proximamente";
  if (path.endsWith("/todos.html")) return "todos";
  return "inicio";
}

async function loadAllGames() {
  const params = new URLSearchParams();
  const urlParams = new URLSearchParams(window.location.search);
  const initialGenre = urlParams.get("genre") || "";
  const genreFilter = document.getElementById("genreFilter");
  if (genreFilter) genreFilter.value = initialGenre;
  if (initialGenre) params.set("genre", initialGenre);

  const year = document.getElementById("yearFilter")?.value || "";
  const sort = document.getElementById("sortFilter")?.value || "rating";
  if (year) params.set("year", year);
  params.set("sort", sort);
  params.set("limit", "300");

  const games = await getJson(`/api/games?${params.toString()}`);
  renderGames(pageGames, games);
  const resultInfo = document.getElementById("resultInfo");
  if (resultInfo) resultInfo.textContent = `${games.length} juego(s)`;
}

function populateYears() {
  const select = document.getElementById("yearFilter");
  if (!select) return;
  const current = new Date().getFullYear();
  for (let year = current; year >= 2012; year--) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    select.appendChild(option);
  }
}

document.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (card) showGame(card.dataset.id).catch((error) => alert(error.message));
});

if (modal) {
  document.getElementById("closeModal")?.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (event) => { if (event.target === modal) modal.classList.add("hidden"); });
}

document.getElementById("searchBtn")?.addEventListener("click", async () => {
  const value = document.getElementById("searchInput")?.value.trim() || "";
  if (!value) return;
  try {
    const games = await getJson(`/api/games?q=${encodeURIComponent(value)}&limit=300`);
    renderGames(catalog || pageGames, games);
  } catch (error) { alert(error.message); }
});

document.getElementById("searchInput")?.addEventListener("keydown", (event) => { if (event.key === "Enter") document.getElementById("searchBtn")?.click(); });
document.getElementById("loginBtn")?.addEventListener("click", () => alert("El módulo de autenticación se desarrolla en el Sprint 2."));
document.getElementById("applyFilters")?.addEventListener("click", () => loadAllGames().catch((error) => alert(error.message)));

(async () => {
  try {
    const page = getCurrentPage();
    if (page === "inicio") await loadHome();
    else if (page === "todos") { populateYears(); await loadAllGames(); }
    else await loadSection(page);
  } catch (error) {
    console.error(error);
    const targets = [catalog, pageGames, document.getElementById("categoryAccion"), document.getElementById("categoryRpg")];
    const target = targets.find(Boolean);
    if (target) target.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
})();
