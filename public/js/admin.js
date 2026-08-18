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

  const clean = String(value).replace(/[}]/g, "").trim();
  const match = clean.match(/^\d{4}-\d{2}-\d{2}/);

  return match ? match[0] : clean;
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
    throw new Error(data.message || "No fue posible completar la operación.");
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

function fillForm(game) {
  document.getElementById("rawgId").value = game.id ?? "";
  document.getElementById("gameTitle").value = game.name ?? "";
  document.getElementById("gameDescription").value =
    game.description_raw ?? game.description ?? "";
  document.getElementById("gameRelease").value = game.released ?? "";
  document.getElementById("gameGenre").value =
    (game.genres || []).slice(0, 3).map((genre) => genre.name).join(", ");
  document.getElementById("gamePlatform").value =
    (game.platforms || [])
      .map((item) => item.platform?.name)
      .filter(Boolean)
      .join(", ") || "PC";
  document.getElementById("gameImage").value =
    game.background_image ?? "";
  document.getElementById("gameRating").value =
    Number(game.rating ?? 0).toFixed(1);

  window.scrollTo({
    top: document.getElementById("gameForm").offsetTop - 100,
    behavior: "smooth"
  });
}


async function loadUsers() {
  const usersList = document.getElementById("usersList");
  const usersStatus = document.getElementById("usersStatus");

  usersStatus.textContent = "Cargando...";

  try {
    const users = await authenticatedFetch("/api/admin/users");

    usersList.innerHTML = users.map((user) => `
      <article class="user-row">
        <div class="user-main">
          <strong>${escapeHtml(user.username)}</strong>
          <span>${escapeHtml(user.email)}</span>
        </div>

        <div class="user-role">
          <select class="role-select" data-user-id="${user.id}">
            <option value="USER" ${user.role === "USER" ? "selected" : ""}>Usuario</option>
            <option value="ADMIN" ${user.role === "ADMIN" ? "selected" : ""}>Administrador</option>
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

    usersStatus.textContent = `${users.length} usuario(s)`;

    document.querySelectorAll(".save-role").forEach((button) => {
      button.addEventListener("click", async () => {
        const userId = button.dataset.userId;
        const select = document.querySelector(
          `.role-select[data-user-id="${userId}"]`
        );

        button.disabled = true;
        button.textContent = "Guardando...";

        try {
          await authenticatedFetch(`/api/admin/users/${userId}/role`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              role: select.value
            })
          });

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

async function searchRawg() {
  const query = rawgSearch.value.trim();

  if (!query) {
    rawgStatus.textContent = "Escribe el nombre de un videojuego.";
    return;
  }

  rawgStatus.textContent = "Buscando...";

  try {
    const data = await authenticatedFetch(
      `/api/games/search?q=${encodeURIComponent(query)}`
    );

    const results = data.results || [];

    if (!results.length) {
      rawgResults.innerHTML = "<p>No se encontraron videojuegos.</p>";
      rawgStatus.textContent = "Sin resultados";
      return;
    }

    rawgResults.innerHTML = results.map((game) => `
      <article class="rawg-card">
        <img
          src="${game.background_image || "https://placehold.co/300x400/0f172a/eff6ff?text=GameHub"}"
          alt="${escapeHtml(game.name)}"
        >

        <div>
          <h3>${escapeHtml(game.name)}</h3>
          <p>
            ${game.released
              ? escapeHtml(formatAdminDate(game.released))
              : "Fecha por confirmar"}
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

    rawgStatus.textContent = `${results.length} resultado(s)`;
  } catch (error) {
    rawgStatus.textContent = error.message;
  }
}

document.getElementById("searchRawgBtn").addEventListener("click", () => {
  searchRawg();
});

rawgSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchRawg();
  }
});

rawgResults.addEventListener("click", async (event) => {
  const button = event.target.closest(".select-rawg");

  if (!button) {
    return;
  }

  try {
    const game = await authenticatedFetch(
      `/api/games/external/rawg/${button.dataset.id}`
    );

    fillForm(game);
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

  if (originalPrice > 0 && salePrice > 0 && salePrice < originalPrice) {
    discount = Math.round(
      ((originalPrice - salePrice) / originalPrice) * 100
    );
  }

  const payload = {
    rawg_id: Number(document.getElementById("rawgId").value) || null,
    title: document.getElementById("gameTitle").value.trim(),
    description: document.getElementById("gameDescription").value.trim(),
    release_date: document.getElementById("gameRelease").value || null,
    image_url: document.getElementById("gameImage").value.trim(),
    custom_image_url:
      document.getElementById("gameCustomImage").value.trim() || null,
    genre: document.getElementById("gameGenre").value.trim(),
    platform: document.getElementById("gamePlatform").value.trim() || "PC",
    rating: Number(document.getElementById("gameRating").value || 0),
    is_on_sale: document.getElementById("gameSale").checked,
    discount_percent: discount,
    original_price: originalPrice || null,
    sale_price: salePrice || null,
    category_id:
      Number(document.getElementById("gameCategory").value) || null
  };

  try {
    adminMessage.textContent = "Registrando videojuego...";

    await authenticatedFetch("/api/games", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    adminMessage.textContent = "Videojuego registrado correctamente.";
    gameForm.reset();
    document.getElementById("gamePlatform").value = "PC";
    document.getElementById("gameRating").value = "0";
  } catch (error) {
    adminMessage.textContent = error.message;
  }
});

document.getElementById("clearFormBtn").addEventListener("click", () => {
  gameForm.reset();
  document.getElementById("gamePlatform").value = "PC";
  document.getElementById("gameRating").value = "0";
  adminMessage.textContent = "";
});

document.getElementById("wishlistBtn").addEventListener("click", () => {
  window.location.href = "/wishlist";
});

document.getElementById("profileBtn").addEventListener("click", () => {
  window.location.href = "/profile";
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("gamehub_token");
  localStorage.removeItem("gamehub_user");
  window.location.href = "/";
});

checkAdminAccess().then((isAdmin) => {
  if (isAdmin) {
    loadUsers();
  }
});
