import { describe, expect, it } from "vitest";

import authReducer, {
  authInitialState,
  clearAuthError,
} from "@/features/auth/store/authSlice";
import {
  loginUser,
  logoutUser,
  restoreSession,
} from "@/features/auth/store/authThunks";
import type { AuthUser } from "@/features/auth/types/auth.types";

const user: AuthUser = {
  id: "user-1",
  name: "Example User",
  email: "user@example.com",
  role: "member",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("authSlice", () => {
  it("stores a user after login succeeds", () => {
    const state = authReducer(
      authInitialState,
      loginUser.fulfilled(user, "request-1", {
        email: "user@example.com",
        password: "password",
      }),
    );

    expect(state.user).toEqual(user);
    expect(state.status).toBe("succeeded");
    expect(state.initialized).toBe(true);
  });

  it("marks session restoration as initialized when no session exists", () => {
    const state = authReducer(
      authInitialState,
      restoreSession.rejected(null, "request-2", undefined),
    );

    expect(state.user).toBeNull();
    expect(state.initialized).toBe(true);
    expect(state.error).toBeNull();
  });

  it("clears the user after logout succeeds", () => {
    const authenticatedState = {
      ...authInitialState,
      user,
      initialized: true,
      status: "succeeded" as const,
    };
    const state = authReducer(
      authenticatedState,
      logoutUser.fulfilled(undefined, "request-3", undefined),
    );

    expect(state.user).toBeNull();
    expect(state.status).toBe("idle");
  });

  it("clears a visible authentication error", () => {
    const state = authReducer(
      {
        ...authInitialState,
        error: { message: "Invalid credentials" },
      },
      clearAuthError(),
    );

    expect(state.error).toBeNull();
  });
});
