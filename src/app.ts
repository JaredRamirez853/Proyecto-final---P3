import express from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth.routes";
import gamesRoutes from "./routes/games.routes";
import wishlistRoutes from "./routes/wishlist.routes";
import adminRoutes from "./routes/admin.routes";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), "public")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "GameHub" });
});

app.use("/api/auth", authRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/admin", adminRoutes);

// Permite acceder a la wishlist con una URL sencilla.
app.get("/wishlist", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "wishlist.html"));
});

// Ruta propia para que /wishlist no sea tratado como la página de inicio.
app.get(["/admin", "/admin/"], (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "admin.html"));
});

app.get(["/profile", "/profile/"], (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "profile.html"));
});

app.get(["/wishlist", "/wishlist/"], (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "wishlist.html"));
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});
