import { createSlice } from "@reduxjs/toolkit";

import { fetchUsers } from "@/features/users/store/usersThunks";
import type { UsersState } from "@/features/users/types/users.types";

export const usersInitialState: UsersState = {
  items: [],
  status: "idle",
  error: null,
};

const usersSlice = createSlice({
  name: "users",
  initialState: usersInitialState,
  reducers: {
    resetUsers: () => usersInitialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.items = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? {
          message: "Unable to load users.",
        };
      });
  },
});

export const { resetUsers } = usersSlice.actions;
export default usersSlice.reducer;
