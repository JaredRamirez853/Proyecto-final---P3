function saveSession(data) {
  localStorage.setItem("gamehub_token", data.token);
  localStorage.setItem("gamehub_user", JSON.stringify(data.user));
}

function getToken() {
  return localStorage.getItem("gamehub_token");
}

function getUser() {
  const value = localStorage.getItem("gamehub_user");
  return value ? JSON.parse(value) : null;
}

function logout() {
  localStorage.removeItem("gamehub_token");
  localStorage.removeItem("gamehub_user");
  window.location.href = "/";
}

async function postAuth(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "No fue posible completar la operación.");
  }

  return result;
}

document.getElementById("loginForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = document.getElementById("loginMessage");
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    message.textContent = "Iniciando sesión...";

    const result = await postAuth("/api/auth/login", {
      email,
      password
    });

    saveSession(result);

    window.location.href =
      result.user?.role === "ADMIN"
        ? "/admin"
        : "/";
  } catch (error) {
    message.textContent = error.message;
  }
});

document.getElementById("registerForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = document.getElementById("registerMessage");
  const username = document.getElementById("registerUsername").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  try {
    message.textContent = "Creando cuenta...";

    const result = await postAuth("/api/auth/register", {
      username,
      email,
      password
    });

    // El registro ya devuelve un JWT, así que no obligamos al usuario a iniciar sesión otra vez.
    saveSession(result);

    message.textContent = "Cuenta creada correctamente. Redirigiendo...";

    setTimeout(() => {
      window.location.href = "/";
    }, 600);
  } catch (error) {
    message.textContent = error.message;
  }
});

window.gameHubAuth = {
  getToken,
  getUser,
  logout
};
