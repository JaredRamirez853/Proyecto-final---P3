import { Router } from "express";
import { pool } from "../db/pool";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        g.id,
        g.title,
        g.description,
        g.release_date,
        g.image_url,
        g.custom_image_url,
        g.genre,
        g.platform,
        g.rating,
        g.is_on_sale,
        g.discount_percent,
        g.original_price,
        g.sale_price
       FROM wishlist w
       JOIN games g ON g.id = w.game_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [req.user!.id]
    );

    return res.json(
      (rows as any[]).map((game) => ({
        ...game,
        image_url: game.custom_image_url || game.image_url
      }))
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "No fue posible consultar la wishlist."
    });
  }
});

router.post("/:gameId", authenticate, async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);

    if (!Number.isInteger(gameId) || gameId <= 0) {
      return res.status(400).json({
        message: "El videojuego indicado no es válido."
      });
    }

    const [gameRows] = await pool.query(
      "SELECT id FROM games WHERE id = ? LIMIT 1",
      [gameId]
    );

    if ((gameRows as any[]).length === 0) {
      return res.status(404).json({
        message: "Videojuego no encontrado."
      });
    }

    const [existingRows] = await pool.query(
      "SELECT user_id FROM wishlist WHERE user_id = ? AND game_id = ? LIMIT 1",
      [req.user!.id, gameId]
    );

    if ((existingRows as any[]).length > 0) {
      return res.status(409).json({
        message: "Este juego ya está en tu wishlist."
      });
    }

    await pool.query(
      "INSERT INTO wishlist (user_id, game_id) VALUES (?, ?)",
      [req.user!.id, gameId]
    );

    return res.status(201).json({
      message: "Juego agregado a tu wishlist."
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "No fue posible agregar el juego a la wishlist."
    });
  }
});

router.delete("/:gameId", authenticate, async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);

    await pool.query(
      "DELETE FROM wishlist WHERE user_id = ? AND game_id = ?",
      [req.user!.id, gameId]
    );

    return res.json({
      message: "Juego eliminado de tu wishlist."
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "No fue posible eliminar el juego de la wishlist."
    });
  }
});

router.get("/contains/:gameId", authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT user_id FROM wishlist WHERE user_id = ? AND game_id = ? LIMIT 1",
      [req.user!.id, req.params.gameId]
    );

    return res.json({
      inWishlist: (rows as any[]).length > 0
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "No fue posible comprobar la wishlist."
    });
  }
});

export default router;
