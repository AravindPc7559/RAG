import { createSlice } from "@reduxjs/toolkit";

import {
  loginUser,
  logoutUser,
  registerUser,
  restoreSession,
} from "@/features/auth/store/authThunks";
import type { AuthState } from "@/features/auth/types/auth.types";

export const authInitialState: AuthState = {
  user: null,
  status: "idle",
  initialized: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState: authInitialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = "succeeded";
        state.initialized = true;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user = null;
        state.status = "idle";
        state.initialized = true;
        state.error = null;
      })
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = "succeeded";
        state.initialized = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? {
          message: "Unable to sign in.",
        };
      })
      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = "succeeded";
        state.initialized = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? {
          message: "Unable to create the account.",
        };
      })
      .addCase(logoutUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.status = "idle";
        state.initialized = true;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? {
          message: "Unable to sign out.",
        };
      });
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
