import { Router } from "express";
import { pool } from "../db/pool";
import { authenticate, requireAdmin } from "../middleware/auth";
import { getRawgGame, searchRawgGames } from "../services/rawg.service";

const router = Router();

function buildGameQuery(req: any) {
  const search = String(req.query.q ?? "").trim();
  const genre = String(req.query.genre ?? "").trim();
  const year = String(req.query.year ?? "").trim();
  const sort = String(req.query.sort ?? "rating").trim();
  const limit = Math.min(Math.max(Number(req.query.limit ?? 300), 1), 300);

  const conditions: string[] = [];
  const values: any[] = [];

  if (search) {
    conditions.push("title LIKE ?");
    values.push(`%${search}%`);
  }

  if (genre) {
    conditions.push("genre LIKE ?");
    values.push(`%${genre}%`);
  }

  if (/^\d{4}$/.test(year)) {
    conditions.push("YEAR(release_date) = ?");
    values.push(Number(year));
  }

  const orderBy = (() => {
    switch (sort) {
      case "year": return "release_date DESC, rating DESC, title ASC";
      case "title": return "title ASC";
      case "rating_asc": return "rating ASC, title ASC";
      default: return "rating DESC, release_date DESC, title ASC";
    }
  })();

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return {
    sql: `SELECT * FROM games ${where} ORDER BY ${orderBy} LIMIT ?`,
    values: [...values, limit]
  };
}

router.get("/featured", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM games WHERE release_date >= '2012-01-01' AND release_date <= CURDATE() ORDER BY rating DESC, title ASC LIMIT 20"
    );
    return res.json(rows);
  } catch {
    return res.status(500).json({ message: "No fue posible consultar los destacados." });
  }
});

router.get("/categories/:genre", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM games
       WHERE genre LIKE ? AND release_date >= '2012-01-01'
       ORDER BY rating DESC, release_date DESC, title ASC
       LIMIT 8`,
      [`%${req.params.genre}%`]
    );
    return res.json(rows);
  } catch {
    return res.status(500).json({ message: "No fue posible consultar la categoría." });
  }
});

router.get("/new", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM games
       WHERE release_date BETWEEN '2025-01-01' AND CURDATE()
       ORDER BY release_date DESC, rating DESC, title ASC
       LIMIT 40`
    );
    return res.json(rows);
  } catch {
    return res.status(500).json({ message: "No fue posible consultar las novedades." });
  }
});

router.get("/sales", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM games
       WHERE is_on_sale = TRUE
       ORDER BY discount_percent DESC, rating DESC, title ASC
       LIMIT 60`
    );
    return res.json(rows);
  } catch {
    return res.status(500).json({ message: "No fue posible consultar las ofertas." });
  }
});

router.get("/upcoming", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM games
       WHERE release_date IS NOT NULL AND release_date > CURDATE()
       ORDER BY release_date ASC, rating DESC, title ASC
       LIMIT 40`
    );
    return res.json(rows);
  } catch {
    return res.status(500).json({ message: "No fue posible consultar los próximos lanzamientos." });
  }
});

router.get("/search", async (req, res) => {
  const search = String(req.query.q ?? "").trim();

  if (!search) {
    return res.status(400).json({ message: "El parámetro q es obligatorio." });
  }

  try {
    const data = await searchRawgGames(search);
    return res.json(data);
  } catch (error) {
    return res.status(502).json({ message: error instanceof Error ? error.message : "Error consultando RAWG." });
  }
});

router.get("/", async (req, res) => {
  try {
    const { sql, values } = buildGameQuery(req);
    const [rows] = await pool.query(sql, values);
    return res.json(rows);
  } catch {
    return res.status(500).json({ message: "No fue posible consultar los videojuegos." });
  }
});


router.get("/admin/list", authenticate, requireAdmin, async (req, res) => {
  try {
    const search = String(req.query.q ?? "").trim();
    const limit = Math.min(
      Math.max(Number(req.query.limit ?? 100), 1),
      300
    );

    const values: any[] = [];
    let where = "";

    if (search) {
      where = "WHERE title LIKE ?";
      values.push(`%${search}%`);
    }

    values.push(limit);

    const [rows] = await pool.query(
      `SELECT id, title, release_date, genre, rating,
              image_url, custom_image_url, is_on_sale,
              discount_percent, original_price, sale_price
       FROM games
       ${where}
       ORDER BY title ASC
       LIMIT ?`,
      values
    );

    return res.json(rows);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "No fue posible consultar el catálogo administrativo."
    });
  }
});

router.get("/external/rawg/:id", async (req, res) => {
  try {
    const data = await getRawgGame(Number(req.params.id));
    return res.json(data);
  } catch (error) {
    return res.status(502).json({ message: error instanceof Error ? error.message : "Error consultando RAWG." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.*, c.name AS category_name
       FROM games g
       LEFT JOIN categories c ON c.id = g.category_id
       WHERE g.id = ?`,
      [req.params.id]
    );

    const game = (rows as any[])[0];

    if (!game) {
      return res.status(404).json({ message: "Videojuego no encontrado." });
    }

    const [storeRows] = await pool.query(
      `SELECT s.id, s.name, gs.url
       FROM game_stores gs
       JOIN stores s ON s.id = gs.store_id
       WHERE gs.game_id = ?`,
      [req.params.id]
    );

    let stores = storeRows as any[];

    if (stores.length === 0) {
      const encodedTitle = encodeURIComponent(game.title);

      stores = [
        {
          id: 1,
          name: "Steam",
          url: `https://store.steampowered.com/search/?term=${encodedTitle}`
        },
        {
          id: 2,
          name: "Epic Games",
          url: `https://store.epicgames.com/en-US/browse?q=${encodedTitle}`
        },
        {
          id: 3,
          name: "GOG",
          url: `https://www.gog.com/en/games?query=${encodedTitle}`
        }
      ];
    }

    return res.json({
      ...game,
      image_url: game.custom_image_url || game.image_url,
      stores
    });
  } catch {
    return res.status(500).json({ message: "No fue posible consultar el videojuego." });
  }
});

router.post("/", authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      rawg_id, title, description, release_date, image_url, custom_image_url,
      genre, platform, rating, is_on_sale, discount_percent,
      original_price, sale_price, category_id
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "El título es obligatorio." });
    }

    const [result] = await pool.query(
      `INSERT INTO games
      (rawg_id, title, description, release_date, image_url, custom_image_url, genre, platform, rating, is_on_sale, discount_percent, original_price, sale_price, category_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rawg_id ?? null, title, description ?? null, release_date ?? null,
        image_url ?? null, custom_image_url ?? null, genre ?? null,
        platform ?? "PC", Number(rating ?? 0), Boolean(is_on_sale),
        Number(discount_percent ?? 0), original_price ?? null, sale_price ?? null,
        category_id ?? null
      ]
    );

    return res.status(201).json({ id: (result as any).insertId });
  } catch {
    return res.status(500).json({ message: "No fue posible crear el videojuego." });
  }
});

router.put("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const fields = [
      "title", "description", "release_date", "image_url", "custom_image_url",
      "genre", "platform", "rating", "is_on_sale", "discount_percent",
      "original_price", "sale_price", "category_id"
    ];

    const updates: string[] = [];
    const values: any[] = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No hay cambios para aplicar." });
    }

    values.push(req.params.id);

    const [result] = await pool.query(
      `UPDATE games SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({
        message: "Videojuego no encontrado."
      });
    }

    return res.json({
      message: "Videojuego actualizado correctamente."
    });
  } catch {
    return res.status(500).json({ message: "No fue posible actualizar el videojuego." });
  }
});

router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM games WHERE id = ?",
      [req.params.id]
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({
        message: "Videojuego no encontrado."
      });
    }

    return res.json({
      message: "Videojuego eliminado correctamente."
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "No fue posible eliminar el videojuego."
    });
  }
});

export default router;
