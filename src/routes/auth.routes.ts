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
      return res.status(400).json({
        message: "Username, email y contraseña son obligatorios."
      });
    }

    if (username.trim().length < 3) {
      return res.status(400).json({
        message: "El username debe tener al menos 3 caracteres."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "La contraseña debe tener al menos 6 caracteres."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    const [existing] = await pool.query(
      "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1",
      [normalizedUsername, normalizedEmail]
    );

    if ((existing as any[]).length > 0) {
      return res.status(409).json({
        message: "El username o correo ya está registrado."
      });
    }

    // La contraseña original nunca se guarda en la base de datos.
    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES (?, ?, ?, 'USER')`,
      [normalizedUsername, normalizedEmail, passwordHash]
    );

    const userId = Number((result as any).insertId);

    // Después del registro entregamos la misma sesión que recibiría al iniciar sesión.
    const token = jwt.sign(
      {
        id: userId,
        username: normalizedUsername,
        role: "USER"
      },
      env.jwtSecret,
      {
        expiresIn: "8h"
      }
    );

    return res.status(201).json({
      message: "Cuenta creada correctamente.",
      token,
      user: {
        id: userId,
        username: normalizedUsername,
        email: normalizedEmail,
        role: "USER"
      }
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "No fue posible crear la cuenta."
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "El correo y la contraseña son obligatorios."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [rows] = await pool.query(
      `SELECT id, username, email, password_hash, role
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [normalizedEmail]
    );

    const user = (rows as any[])[0];

    if (!user) {
      return res.status(401).json({
        message: "Correo o contraseña incorrectos."
      });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({
        message: "Correo o contraseña incorrectos."
      });
    }

    // El token identifica al usuario en las siguientes solicitudes protegidas.
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      env.jwtSecret,
      {
        expiresIn: "8h"
      }
    );

    return res.json({
      message: "Inicio de sesión correcto.",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "No fue posible iniciar sesión."
    });
  }
});


router.put("/profile", authenticate, async (req, res) => {
  try {
    const { username, password } = req.body;
    const updates: string[] = [];
    const values: any[] = [];

    if (username !== undefined) {
      const normalizedUsername = String(username).trim();

      if (normalizedUsername.length < 3) {
        return res.status(400).json({
          message: "El username debe tener al menos 3 caracteres."
        });
      }

      const [existing] = await pool.query(
        "SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1",
        [normalizedUsername, req.user!.id]
      );

      if ((existing as any[]).length > 0) {
        return res.status(409).json({
          message: "Ese username ya está en uso."
        });
      }

      updates.push("username = ?");
      values.push(normalizedUsername);
    }

    if (password !== undefined) {
      if (String(password).length < 6) {
        return res.status(400).json({
          message: "La contraseña debe tener al menos 6 caracteres."
        });
      }

      // El cambio de contraseña vuelve a generar el hash antes de guardarlo.
      const passwordHash = await bcrypt.hash(String(password), 10);

      updates.push("password_hash = ?");
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        message: "No hay cambios para actualizar."
      });
    }

    values.push(req.user!.id);

    await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    const [rows] = await pool.query(
      `SELECT id, username, email, role
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.user!.id]
    );

    return res.json({
      message: "Perfil actualizado correctamente.",
      user: (rows as any[])[0]
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "No fue posible actualizar el perfil."
    });
  }
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, email, role
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.user!.id]
    );

    const user = (rows as any[])[0];

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado."
      });
    }

    return res.json(user);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "No fue posible consultar el usuario."
    });
  }
});

export default router;
