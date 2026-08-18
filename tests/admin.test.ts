import request from "supertest";
import { app } from "../src/app";

describe("Administración de videojuegos", () => {
  it("requiere autenticación para registrar un videojuego", async () => {
    const response = await request(app)
      .post("/api/games")
      .send({
        title: "Juego de prueba"
      });

    expect(response.status).toBe(401);
  });
});
