const rawgSearch = document.getElementById("rawgSearch");
const rawgResults = document.getElementById("rawgResults");
const rawgStatus = document.getElementById("rawgStatus");
const gameForm = document.getElementById("gameForm");
const adminMessage = document.getElementById("adminMessage");

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

function formatAdminDate(value) {
  if (!value) return "";

  const match = String(value).match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : String(value).trim();
}

async function authenticatedFetch(url, options = {}) {
  const token = getToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || "No fue posible completar la operación."
    );
  }

  return data;
}

async function checkAdminAccess() {
  if (!getToken()) {
    window.location.href = "/login.html";
    return false;
  }

  try {
    const user = await authenticatedFetch("/api/auth/me");

    if (user.role !== "ADMIN") {
      window.location.href = "/";
      return false;
    }

    return true;
  } catch {
    localStorage.removeItem("gamehub_token");
    localStorage.removeItem("gamehub_user");
    window.location.href = "/login.html";
    return false;
  }
}

// RAWG se usa para registrar juegos nuevos; el catálogo de GameHub se usa para editar los existentes.
function fillNewGameForm(game) {
  resetGameForm();

  document.getElementById("rawgId").value = game.id ?? "";
  document.getElementById("gameTitle").value = game.name ?? "";
  document.getElementById("gameDescription").value =
    game.description_raw ?? game.description ?? "";
  document.getElementById("gameRelease").value =
    formatAdminDate(game.released);
  document.getElementById("gameGenre").value =
    (game.genres || [])
      .slice(0, 3)
      .map((genre) => genre.name)
      .join(", ");

  const platformValue =
    (game.platforms || [])
      .map((item) => item.platform?.name)
      .filter(Boolean)
      .join(", ") || "PC";

  document.getElementById("gamePlatform").value = platformValue;
  document.getElementById("gameImage").value =
    game.background_image ?? "";
  document.getElementById("gameRating").value =
    Number(game.rating ?? 0).toFixed(1);

  document.getElementById("gameFormTitle").textContent =
    "Nuevo videojuego";
  gameForm.dataset.editingId = "";
}

function fillEditForm(game) {
  document.getElementById("rawgId").value = game.rawg_id ?? "";
  document.getElementById("gameTitle").value = game.title ?? "";
  document.getElementById("gameDescription").value =
    game.description ?? "";
  document.getElementById("gameRelease").value =
    formatAdminDate(game.release_date);
  document.getElementById("gameGenre").value =
    game.genre ?? "";
  document.getElementById("gamePlatform").value =
    game.platform ?? "PC";
  document.getElementById("gameImage").value =
    game.image_url ?? "";
  document.getElementById("gameCustomImage").value =
    game.custom_image_url ?? "";
  document.getElementById("gameRating").value =
    Number(game.rating ?? 0).toFixed(1);
  document.getElementById("gameSale").checked =
    Boolean(game.is_on_sale);
  document.getElementById("originalPrice").value =
    game.original_price ?? "";
  document.getElementById("salePrice").value =
    game.sale_price ?? "";

  document.getElementById("gameFormTitle").textContent =
    "Editar videojuego";
  gameForm.dataset.editingId = String(game.id);

  const button = gameForm.querySelector('button[type="submit"]');
  button.textContent = "Guardar cambios";

  window.scrollTo({
    top: gameForm.offsetTop - 100,
    behavior: "smooth"
  });
}

function resetGameForm() {
  gameForm.reset();
  gameForm.dataset.editingId = "";

  document.getElementById("rawgId").value = "";
  document.getElementById("gamePlatform").value = "PC";
  document.getElementById("gameRating").value = "0";
  document.getElementById("gameFormTitle").textContent =
    "Nuevo videojuego";

  const button = gameForm.querySelector('button[type="submit"]');
  button.textContent = "Registrar videojuego";
}

async function searchRawg() {
  const query = rawgSearch.value.trim();

  if (!query) {
    rawgStatus.textContent =
      "Escribe el nombre de un videojuego.";
    return;
  }

  rawgStatus.textContent = "Buscando...";

  try {
    const data = await authenticatedFetch(
      `/api/games/search?q=${encodeURIComponent(query)}`
    );

    const results = data.results || [];

    if (!results.length) {
      rawgResults.innerHTML =
        "<p>No se encontraron videojuegos.</p>";
      rawgStatus.textContent = "Sin resultados";
      return;
    }

    rawgResults.innerHTML = results.map((game) => `
      <article class="rawg-card">
        <img
          src="${
            game.background_image ||
            "https://placehold.co/300x400/0f172a/eff6ff?text=GameHub"
          }"
          alt="${escapeHtml(game.name)}"
        >

        <div>
          <h3>${escapeHtml(game.name)}</h3>

          <p>
            ${
              game.released
                ? escapeHtml(formatAdminDate(game.released))
                : "Fecha por confirmar"
            }
          </p>

          <p>★ ${Number(game.rating || 0).toFixed(1)}</p>

          <button
            class="secondary-button select-rawg"
            data-id="${game.id}"
          >
            Usar este juego
          </button>
        </div>
      </article>
    `).join("");

    rawgStatus.textContent =
      `${results.length} resultado(s)`;
  } catch (error) {
    rawgStatus.textContent = error.message;
  }
}

async function loadUsers() {
  const usersList = document.getElementById("usersList");
  const usersStatus = document.getElementById("usersStatus");

  usersStatus.textContent = "Cargando...";

  try {
    const users = await authenticatedFetch(
      "/api/admin/users"
    );

    usersList.innerHTML = users.map((user) => `
      <article class="user-row">
        <div class="user-main">
          <strong>${escapeHtml(user.username)}</strong>
          <span>${escapeHtml(user.email)}</span>
        </div>

        <div class="user-role">
          <select
            class="role-select"
            data-user-id="${user.id}"
          >
            <option
              value="USER"
              ${user.role === "USER" ? "selected" : ""}
            >
              Usuario
            </option>

            <option
              value="ADMIN"
              ${user.role === "ADMIN" ? "selected" : ""}
            >
              Administrador
            </option>
          </select>

          <button
            class="secondary-button save-role"
            data-user-id="${user.id}"
          >
            Guardar
          </button>
        </div>
      </article>
    `).join("");

    usersStatus.textContent =
      `${users.length} usuario(s)`;

    document.querySelectorAll(".save-role")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          const userId = button.dataset.userId;
          const select = document.querySelector(
            `.role-select[data-user-id="${userId}"]`
          );

          button.disabled = true;
          button.textContent = "Guardando...";

          try {
            await authenticatedFetch(
              `/api/admin/users/${userId}/role`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  role: select.value
                })
              }
            );

            button.textContent = "Guardado";

            setTimeout(() => {
              button.textContent = "Guardar";
              button.disabled = false;
            }, 800);
          } catch (error) {
            adminMessage.textContent = error.message;
            button.textContent = "Guardar";
            button.disabled = false;
          }
        });
      });
  } catch (error) {
    usersStatus.textContent = error.message;
  }
}

async function loadAdminGames(search = "") {
  const gamesList = document.getElementById("adminGamesList");
  const gamesStatus = document.getElementById("gamesStatus");

  gamesStatus.textContent = "Cargando...";

  try {
    const url = search
      ? `/api/games/admin/list?q=${encodeURIComponent(search)}`
      : "/api/games/admin/list";

    const games = await authenticatedFetch(url);

    if (!games.length) {
      gamesList.innerHTML =
        "<p>No hay videojuegos registrados.</p>";
      gamesStatus.textContent = "0 juegos";
      return;
    }

    gamesList.innerHTML = games.map((game) => `
      <article class="admin-game-row">
        <img
          src="${
            game.custom_image_url ||
            game.image_url ||
            "https://placehold.co/80x100/0f172a/eff6ff?text=GameHub"
          }"
          alt="${escapeHtml(game.title)}"
        >

        <div class="admin-game-info">
          <strong>${escapeHtml(game.title)}</strong>
          <span>
            ${escapeHtml(
              formatAdminDate(game.release_date)
            )}
          </span>
          <span>
            ★ ${Number(game.rating || 0).toFixed(1)}
          </span>
        </div>

        <div class="admin-game-actions">
          <button
            class="secondary-button edit-game"
            data-game-id="${game.id}"
          >
            Editar
          </button>

          <button
            class="danger-button delete-game"
            data-game-id="${game.id}"
            data-game-title="${escapeHtml(game.title)}"
          >
            Eliminar
          </button>
        </div>
      </article>
    `).join("");

    gamesStatus.textContent =
      `${games.length} juego(s)`;

    document.querySelectorAll(".edit-game")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          try {
            const game = await authenticatedFetch(
              `/api/games/${button.dataset.gameId}`
            );

            fillEditForm(game);
          } catch (error) {
            adminMessage.textContent = error.message;
          }
        });
      });

    document.querySelectorAll(".delete-game")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          const title = button.dataset.gameTitle;

          if (!confirm(
            `¿Eliminar "${title}" del catálogo?`
          )) {
            return;
          }

          try {
            await authenticatedFetch(
              `/api/games/${button.dataset.gameId}`,
              {
                method: "DELETE"
              }
            );

            adminMessage.textContent =
              "Videojuego eliminado correctamente.";

            await loadAdminGames(
              document.getElementById(
                "adminGameSearch"
              ).value.trim()
            );
          } catch (error) {
            adminMessage.textContent = error.message;
          }
        });
      });
  } catch (error) {
    gamesStatus.textContent = error.message;
  }
}

rawgSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchRawg();
  }
});

document
  .getElementById("searchRawgBtn")
  .addEventListener("click", searchRawg);

rawgResults.addEventListener("click", async (event) => {
  const button = event.target.closest(".select-rawg");

  if (!button) return;

  try {
    const game = await authenticatedFetch(
      `/api/games/external/rawg/${button.dataset.id}`
    );

    fillNewGameForm(game);
  } catch (error) {
    adminMessage.textContent = error.message;
  }
});

gameForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const originalPrice = Number(
    document.getElementById("originalPrice").value || 0
  );

  const salePrice = Number(
    document.getElementById("salePrice").value || 0
  );

  let discount = 0;

  if (
    originalPrice > 0 &&
    salePrice > 0 &&
    salePrice < originalPrice
  ) {
    discount = Math.round(
      ((originalPrice - salePrice) /
        originalPrice) * 100
    );
  }

  const payload = {
    rawg_id:
      Number(document.getElementById("rawgId").value) ||
      null,
    title:
      document.getElementById("gameTitle").value.trim(),
    description:
      document.getElementById("gameDescription").value.trim(),
    release_date:
      document.getElementById("gameRelease").value ||
      null,
    image_url:
      document.getElementById("gameImage").value.trim(),
    custom_image_url:
      document.getElementById("gameCustomImage").value.trim() ||
      null,
    genre:
      document.getElementById("gameGenre").value.trim(),
    platform:
      document.getElementById("gamePlatform").value.trim() ||
      "PC",
    rating:
      Number(document.getElementById("gameRating").value || 0),
    is_on_sale:
      document.getElementById("gameSale").checked,
    discount_percent: discount,
    original_price:
      originalPrice || null,
    sale_price:
      salePrice || null,
    category_id:
      Number(
        document.getElementById("gameCategory").value
      ) || null
  };

  const editingId = gameForm.dataset.editingId;

  try {
    adminMessage.textContent = editingId
      ? "Guardando cambios..."
      : "Registrando videojuego...";

    await authenticatedFetch(
      editingId
        ? `/api/games/${editingId}`
        : "/api/games",
      {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    adminMessage.textContent = editingId
      ? "Videojuego actualizado correctamente."
      : "Videojuego registrado correctamente.";

    resetGameForm();

    await loadAdminGames(
      document.getElementById(
        "adminGameSearch"
      ).value.trim()
    );
  } catch (error) {
    adminMessage.textContent = error.message;
  }
});

document
  .getElementById("clearFormBtn")
  .addEventListener("click", () => {
    resetGameForm();
    adminMessage.textContent = "";
  });

document
  .getElementById("searchAdminGamesBtn")
  .addEventListener("click", () => {
    loadAdminGames(
      document.getElementById(
        "adminGameSearch"
      ).value.trim()
    );
  });

document
  .getElementById("adminGameSearch")
  .addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      loadAdminGames(event.target.value.trim());
    }
  });

document
  .getElementById("wishlistBtn")
  .addEventListener("click", () => {
    window.location.href = "/wishlist";
  });

document
  .getElementById("profileBtn")
  .addEventListener("click", () => {
    window.location.href = "/profile";
  });

document
  .getElementById("logoutBtn")
  .addEventListener("click", () => {
    localStorage.removeItem("gamehub_token");
    localStorage.removeItem("gamehub_user");
    window.location.href = "/";
  });

checkAdminAccess().then((isAdmin) => {
  if (isAdmin) {
    loadUsers();
    loadAdminGames();
  }
});
