import { pool } from "../src/db/pool";

export default async function globalTeardown() {
  await pool.end();
}
