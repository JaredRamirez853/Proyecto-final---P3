function getToken() {
  return localStorage.getItem("gamehub_token");
}

function getStoredUser() {
  const value = localStorage.getItem("gamehub_user");
  return value ? JSON.parse(value) : null;
}

async function loadProfile() {
  const token = getToken();

  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  const response = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    localStorage.removeItem("gamehub_token");
    localStorage.removeItem("gamehub_user");
    window.location.href = "/login.html";
    return;
  }

  document.getElementById("profileEmail").textContent = data.email;
  document.getElementById("profileRole").textContent = data.role;
  document.getElementById("profileUsername").value = data.username;

  localStorage.setItem("gamehub_user", JSON.stringify(data));
}

document.getElementById("profileForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const token = getToken();
  const message = document.getElementById("profileMessage");
  const username = document.getElementById("profileUsername").value.trim();
  const password = document.getElementById("profilePassword").value;
  const passwordConfirm = document.getElementById("profilePasswordConfirm").value;

  if (password && password !== passwordConfirm) {
    message.textContent = "Las contraseñas no coinciden.";
    return;
  }

  const body = { username };

  if (password) {
    body.password = password;
  }

  try {
    message.textContent = "Guardando cambios...";

    const response = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "No fue posible actualizar el perfil.");
    }

    localStorage.setItem("gamehub_user", JSON.stringify(data.user));

    document.getElementById("profilePassword").value = "";
    document.getElementById("profilePasswordConfirm").value = "";
    message.textContent = "Perfil actualizado correctamente.";
  } catch (error) {
    message.textContent = error.message;
  }
});

document.getElementById("wishlistBtn")?.addEventListener("click", () => {
  window.location.href = "/wishlist";
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("gamehub_token");
  localStorage.removeItem("gamehub_user");
  window.location.href = "/";
});

loadProfile().catch((error) => {
  document.getElementById("profileMessage").textContent = error.message;
});
