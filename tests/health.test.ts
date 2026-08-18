import request from "supertest";
import { app } from "../src/app";

describe("Health check", () => {
  it("debe responder con estado ok", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.app).toBe("GameHub");
  });
});
