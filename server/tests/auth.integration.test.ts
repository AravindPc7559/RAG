import request from "supertest";

import { createApp } from "../src/app.js";
import { FakeUserRepository } from "./support/FakeUserRepository.js";

interface SuccessBody<T> {
  success: true;
  data: T;
  message?: string;
}

interface ErrorBody {
  success: false;
  code: string;
  message: string;
}

interface TestUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

function createTestApp() {
  return createApp({ userRepository: new FakeUserRepository() }).app;
}

describe("authentication API", () => {
  it("rejects protected requests without a session cookie", async () => {
    const response = await request(createTestApp()).get("/api/v1/auth/me");

    expect(response.status).toBe(401);
    expect((response.body as ErrorBody).code).toBe("UNAUTHORIZED");
  });

  it("registers, restores the cookie session, and returns the current user", async () => {
    const agent = request.agent(createTestApp());

    const registration = await agent.post("/api/v1/auth/register").send({
      name: "Example Member",
      email: "member@example.com",
      password: "strong-password",
    });

    expect(registration.status).toBe(201);
    expect(registration.headers["set-cookie"]).toBeDefined();
    expect((registration.body as SuccessBody<TestUser>).data).toMatchObject({
      name: "Example Member",
      email: "member@example.com",
      role: "member",
    });

    const session = await agent.get("/api/v1/auth/me");
    expect(session.status).toBe(200);
    expect((session.body as SuccessBody<TestUser>).data.email).toBe(
      "member@example.com",
    );
  });

  it("prevents duplicate registration", async () => {
    const app = createTestApp();
    const payload = {
      name: "Duplicate User",
      email: "duplicate@example.com",
      password: "strong-password",
    };

    await request(app).post("/api/v1/auth/register").send(payload).expect(201);
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(payload);

    expect(response.status).toBe(409);
    expect((response.body as ErrorBody).code).toBe("CONFLICT");
  });

  it("rejects invalid registration input", async () => {
    const response = await request(createTestApp())
      .post("/api/v1/auth/register")
      .send({
        name: "A",
        email: "not-an-email",
        password: "short",
      });

    expect(response.status).toBe(400);
    expect((response.body as ErrorBody).code).toBe("BAD_REQUEST");
  });

  it("clears the session cookie on logout", async () => {
    const agent = request.agent(createTestApp());

    await agent.post("/api/v1/auth/register").send({
      name: "Logout User",
      email: "logout@example.com",
      password: "strong-password",
    });
    await agent.post("/api/v1/auth/logout").expect(200);
    await agent.get("/api/v1/auth/me").expect(401);
  });
});
