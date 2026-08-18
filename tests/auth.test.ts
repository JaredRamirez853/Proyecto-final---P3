import request from "supertest";
import { app } from "../src/app";

describe("Autenticación", () => {
  it("rechaza un registro sin datos obligatorios", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("obligatorios");
  });

  it("rechaza un username demasiado corto", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        username: "ab",
        email: "usuario@example.com",
        password: "123456"
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("3 caracteres");
  });

  it("rechaza una contraseña demasiado corta", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        username: "usuario",
        email: "usuario@example.com",
        password: "123"
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("6 caracteres");
  });

  it("rechaza un login sin credenciales", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("obligatorios");
  });

  it("protege la consulta del usuario autenticado", async () => {
    const response = await request(app)
      .get("/api/auth/me");

    expect(response.status).toBe(401);
  });
});
