import request from "supertest";
import { app } from "../src/app";

describe("Videojuegos", () => {
  it("rechaza una búsqueda RAWG sin término", async () => {
    const response = await request(app)
      .get("/api/games/search");

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("q");
  });

  it("rechaza la consulta de un videojuego inexistente", async () => {
    const response = await request(app)
      .get("/api/games/999999999");

    expect([404, 500]).toContain(response.status);
  });
});
