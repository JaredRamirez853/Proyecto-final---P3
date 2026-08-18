import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 3000),
  dbHost: process.env.DB_HOST ?? "localhost",
  dbPort: Number(process.env.DB_PORT ?? 3306),
  dbUser: process.env.DB_USER ?? "root",
  dbPassword: process.env.DB_PASSWORD ?? "",
  dbName: process.env.DB_NAME ?? "gamehub",
  jwtSecret: process.env.JWT_SECRET ?? "development_secret",
  rawgApiKey: process.env.RAWG_API_KEY ?? ""
};
