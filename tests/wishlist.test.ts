import request from "supertest";
import { app } from "../src/app";

describe("Wishlist", () => {
  it("requiere autenticación para consultar la wishlist", async () => {
    const response = await request(app).get("/api/wishlist");

    expect(response.status).toBe(401);
  });

  it("requiere autenticación para agregar un juego", async () => {
    const response = await request(app).post("/api/wishlist/1");

    expect(response.status).toBe(401);
  });

  it("requiere autenticación para eliminar un juego", async () => {
    const response = await request(app).delete("/api/wishlist/1");

    expect(response.status).toBe(401);
  });
});
