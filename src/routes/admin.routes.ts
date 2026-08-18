import { Router } from "express";
import { pool } from "../db/pool";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/users", authenticate, requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, email, role, created_at
       FROM users
       ORDER BY username ASC`
    );

    return res.json(rows);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "No fue posible consultar los usuarios."
    });
  }
});

router.put("/users/:id/role", authenticate, requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const role = String(req.body.role ?? "").toUpperCase();

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "El usuario indicado no es válido."
      });
    }

    if (!["USER", "ADMIN"].includes(role)) {
      return res.status(400).json({
        message: "El rol indicado no es válido."
      });
    }

    if (userId === req.user!.id && role !== "ADMIN") {
      return res.status(400).json({
        message: "El administrador actual no puede quitarse su propio rol."
      });
    }

    const [result] = await pool.query(
      "UPDATE users SET role = ? WHERE id = ?",
      [role, userId]
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({
        message: "Usuario no encontrado."
      });
    }

    return res.json({
      message: `Rol actualizado a ${role}.`
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "No fue posible actualizar el rol."
    });
  }
});

export default router;
