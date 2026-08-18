import { app } from "./app";
import { env } from "./config/env";

app.listen(env.port, () => {
  console.log(`GameHub ejecutándose en http://localhost:${env.port}`);
});
