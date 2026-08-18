const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");
const wishlistGrid = document.getElementById("wishlistGrid");
const wishlistCount = document.getElementById("wishlistCount");
const wishlistMessage = document.getElementById("wishlistMessage");

function getToken() {
  return localStorage.getItem("gamehub_token");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "Fecha por confirmar";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-DO", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function gameImage(game) {
  return game.custom_image_url ||
    game.image_url ||
    "https://placehold.co/600x800/0f172a/eff6ff?text=GameHub";
}

function renderWishlist(games) {
  wishlistCount.textContent = `${games.length} juego(s) guardado(s)`;

  if (!games.length) {
    wishlistGrid.innerHTML = `
      <div class="empty-state">
        <h2>Tu wishlist está vacía</h2>
        <p>Agrega juegos desde la ficha de cualquier videojuego.</p>
        <a href="/todos.html" class="primary-button">Explorar juegos</a>
      </div>
    `;
    return;
  }

  wishlistGrid.innerHTML = games.map((game) => `
    <article class="card wishlist-card" data-id="${game.id}">
      <img
        src="${gameImage(game)}"
        alt="${escapeHtml(game.title)}"
        loading="lazy"
      >

      <div class="card-body">
        <div class="card-title-row">
          <h3>${escapeHtml(game.title)}</h3>
          ${game.rating
            ? `<span class="rating">★ ${Number(game.rating).toFixed(1)}</span>`
            : ""}
        </div>

        <p>${formatDate(game.release_date)}</p>

        <button
          class="remove-wishlist"
          data-game-id="${game.id}"
        >
          Eliminar de wishlist
        </button>
      </div>
    </article>
  `).join("");
}

async function getWishlist() {
  const token = getToken();

  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  const response = await fetch("/api/wishlist", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No fue posible cargar la wishlist.");
  }

  renderWishlist(data);
}

async function removeFromWishlist(gameId) {
  const token = getToken();

  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  const response = await fetch(`/api/wishlist/${gameId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No fue posible eliminar el juego.");
  }

  await getWishlist();
}

document.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-wishlist");

  if (removeButton) {
    event.stopPropagation();

    removeFromWishlist(removeButton.dataset.gameId)
      .catch((error) => {
        wishlistMessage.textContent = error.message;
      });

    return;
  }

  const card = event.target.closest(".wishlist-card");

  if (card) {
    window.location.href = `/?game=${card.dataset.id}`;
  }
});

document.getElementById("wishlistBtn")?.addEventListener("click", () => {
  window.location.href = "/wishlist";
});

function updateWishlistAuthButton() {
  const button = document.getElementById("loginBtn");

  if (!button) return;

  const token = getToken();
  const rawUser = localStorage.getItem("gamehub_user");
  const user = rawUser ? JSON.parse(rawUser) : null;

  if (token) {
    button.textContent = user?.username
      ? `${user.username} | Cerrar sesión`
      : "Cerrar sesión";

    button.onclick = () => {
      localStorage.removeItem("gamehub_token");
      localStorage.removeItem("gamehub_user");
      window.location.href = "/";
    };
    return;
  }

  button.textContent = "Iniciar sesión";
  button.onclick = () => {
    window.location.href = "/login.html";
  };
}

updateWishlistAuthButton();

document.getElementById("closeModal")?.addEventListener("click", () => {
  modal.classList.add("hidden");
});

(async () => {
  try {
    await getWishlist();
  } catch (error) {
    wishlistMessage.textContent = error.message;
  }
})();
