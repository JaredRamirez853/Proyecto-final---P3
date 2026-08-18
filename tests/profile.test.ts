import request from "supertest";
import { app } from "../src/app";

describe("Perfil", () => {
  it("requiere autenticación para consultar el perfil", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
  });

  it("requiere autenticación para modificar el perfil", async () => {
    const response = await request(app)
      .put("/api/auth/profile")
      .send({});

    expect(response.status).toBe(401);
  });
});
