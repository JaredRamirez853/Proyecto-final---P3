import { Router } from "express";
import { pool } from "../db/pool";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT g.*
     FROM wishlist w
     JOIN games g ON g.id = w.game_id
     WHERE w.user_id = ?
     ORDER BY w.created_at DESC`,
    [req.user!.id]
  );

  return res.json((rows as any[]).map((game) => ({
    ...game,
    image_url: game.custom_image_url || game.image_url
  })));
});

router.post("/:gameId", authenticate, async (req, res) => {
  try {
    await pool.query(
      "INSERT INTO wishlist (user_id, game_id) VALUES (?, ?)",
      [req.user!.id, req.params.gameId]
    );

    return res.status(201).json({ message: "Juego agregado a la wishlist." });
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "El juego ya está en la wishlist." });
    }

    return res.status(500).json({ message: "No fue posible agregar el juego." });
  }
});

router.delete("/:gameId", authenticate, async (req, res) => {
  await pool.query(
    "DELETE FROM wishlist WHERE user_id = ? AND game_id = ?",
    [req.user!.id, req.params.gameId]
  );

  return res.json({ message: "Juego eliminado de la wishlist." });
});

export default router;
