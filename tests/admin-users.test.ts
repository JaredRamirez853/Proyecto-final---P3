import request from "supertest";
import { app } from "../src/app";

describe("Usuarios administrativos", () => {
  it("requiere autenticación para consultar usuarios", async () => {
    const response = await request(app).get("/api/admin/users");

    expect(response.status).toBe(401);
  });

  it("requiere autenticación para modificar roles", async () => {
    const response = await request(app)
      .put("/api/admin/users/1/role")
      .send({ role: "ADMIN" });

    expect(response.status).toBe(401);
  });
});
