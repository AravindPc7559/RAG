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

describe("authentication and protected users API", () => {
  it("rejects protected requests without a session cookie", async () => {
    const response = await request(
      createApp({ userRepository: new FakeUserRepository() }),
    ).get("/api/v1/users");

    expect(response.status).toBe(401);
    expect((response.body as ErrorBody).code).toBe("UNAUTHORIZED");
  });

  it("registers, restores the cookie session, and lists users", async () => {
    const agent = request.agent(
      createApp({ userRepository: new FakeUserRepository() }),
    );

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

    const users = await agent.get("/api/v1/users");
    expect(users.status).toBe(200);
    expect((users.body as SuccessBody<TestUser[]>).data).toHaveLength(1);
  });

  it("prevents duplicate registration", async () => {
    const app = createApp({ userRepository: new FakeUserRepository() });
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
    const response = await request(
      createApp({ userRepository: new FakeUserRepository() }),
    )
      .post("/api/v1/auth/register")
      .send({
        name: "A",
        email: "not-an-email",
        password: "short",
      });

    expect(response.status).toBe(400);
    expect((response.body as ErrorBody).code).toBe("BAD_REQUEST");
  });

  it("prevents members from using admin-only user mutations", async () => {
    const agent = request.agent(
      createApp({ userRepository: new FakeUserRepository() }),
    );

    await agent.post("/api/v1/auth/register").send({
      name: "Workspace Member",
      email: "member@example.com",
      password: "strong-password",
    });
    const response = await agent.post("/api/v1/users").send({
      name: "Another User",
      email: "another@example.com",
      password: "another-password",
      role: "viewer",
    });

    expect(response.status).toBe(403);
    expect((response.body as ErrorBody).code).toBe("FORBIDDEN");
  });

  it("clears the session cookie on logout", async () => {
    const agent = request.agent(
      createApp({ userRepository: new FakeUserRepository() }),
    );

    await agent.post("/api/v1/auth/register").send({
      name: "Logout User",
      email: "logout@example.com",
      password: "strong-password",
    });
    await agent.post("/api/v1/auth/logout").expect(200);
    await agent.get("/api/v1/auth/me").expect(401);
  });
});
