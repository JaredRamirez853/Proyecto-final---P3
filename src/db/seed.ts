import bcrypt from "bcryptjs";
import { pool } from "./pool";

async function seed() {
  await pool.query("INSERT IGNORE INTO categories (name) VALUES ('RPG'), ('Acción'), ('Aventura'), ('Terror'), ('Estrategia'), ('Indie')");
  await pool.query("INSERT IGNORE INTO stores (name) VALUES ('Steam'), ('Epic Games'), ('GOG')");

  const passwordHash = await bcrypt.hash("admin123", 10);
  await pool.query(
    "INSERT IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'ADMIN')",
    ["admin", "admin@gamehub.local", passwordHash]
  );

  console.log("Seed completado.");
  await pool.end();
}

seed().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
