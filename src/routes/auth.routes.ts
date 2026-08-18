import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool";
import { env } from "../config/env";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email y password son obligatorios." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres." });
    }

    const [existing] = await pool.query(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if ((existing as any[]).length > 0) {
      return res.status(409).json({ message: "El usuario o correo ya existe." });
    }

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
      [username, email, hash]
    );

    return res.status(201).json({ message: "Usuario registrado correctamente." });
  } catch {
    return res.status(500).json({ message: "No fue posible registrar el usuario." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query(
      "SELECT id, username, password_hash, role FROM users WHERE email = ?",
      [email]
    );

    const user = (rows as any[])[0];

    if (!user || !(await bcrypt.compare(password ?? "", user.password_hash))) {
      return res.status(401).json({ message: "Credenciales incorrectas." });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      env.jwtSecret,
      { expiresIn: "8h" }
    );

    return res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch {
    return res.status(500).json({ message: "No fue posible iniciar sesión." });
  }
});

router.get("/me", authenticate, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, username, email, role FROM users WHERE id = ?",
    [req.user!.id]
  );

  return res.json((rows as any[])[0]);
});

router.put("/profile", authenticate, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (username) {
      await pool.query("UPDATE users SET username = ? WHERE id = ?", [
        username,
        req.user!.id
      ]);
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres." });
      }

      const hash = await bcrypt.hash(password, 10);
      await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
        hash,
        req.user!.id
      ]);
    }

    return res.json({ message: "Perfil actualizado." });
  } catch {
    return res.status(500).json({ message: "No fue posible actualizar el perfil." });
  }
});

export default router;
