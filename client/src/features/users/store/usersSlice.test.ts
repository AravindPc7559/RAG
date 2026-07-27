import { describe, expect, it } from "vitest";

import usersReducer, {
  usersInitialState,
} from "@/features/users/store/usersSlice";
import { fetchUsers } from "@/features/users/store/usersThunks";
import type { UserListItem } from "@/features/users/types/users.types";

const user: UserListItem = {
  id: "user-1",
  name: "Example User",
  email: "user@example.com",
  role: "member",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("usersSlice", () => {
  it("stores fetched users", () => {
    const state = usersReducer(
      usersInitialState,
      fetchUsers.fulfilled([user], "request-1", undefined),
    );

    expect(state.items).toEqual([user]);
    expect(state.status).toBe("succeeded");
  });

  it("stores a serializable API failure", () => {
    const state = usersReducer(
      usersInitialState,
      fetchUsers.rejected(
        null,
        "request-2",
        undefined,
        { message: "Request failed", status: 500 },
      ),
    );

    expect(state.status).toBe("failed");
    expect(state.error?.status).toBe(500);
  });
});
