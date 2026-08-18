import request from "supertest";
import { app } from "../src/app";

describe("CRUD administrativo de videojuegos", () => {
  it("requiere autenticación para consultar el catálogo administrativo", async () => {
    const response = await request(app)
      .get("/api/games/admin/list");

    expect(response.status).toBe(401);
  });

  it("requiere autenticación para editar un videojuego", async () => {
    const response = await request(app)
      .put("/api/games/1")
      .send({ title: "Juego actualizado" });

    expect(response.status).toBe(401);
  });

  it("requiere autenticación para eliminar un videojuego", async () => {
    const response = await request(app)
      .delete("/api/games/1");

    expect(response.status).toBe(401);
  });
});
