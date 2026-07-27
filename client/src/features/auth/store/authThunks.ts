import { createAsyncThunk } from "@reduxjs/toolkit";

import type { RootState } from "@/app/store/store";
import { authService } from "@/features/auth/api/authService";
import type {
  AuthUser,
  LoginInput,
  RegisterInput,
} from "@/features/auth/types/auth.types";
import {
  toApiErrorPayload,
  type ApiErrorPayload,
} from "@/services/apiErrors";

interface AuthThunkConfig {
  rejectValue: ApiErrorPayload;
}

export const loginUser = createAsyncThunk<
  AuthUser,
  LoginInput,
  AuthThunkConfig
>("auth/login", async (input, { rejectWithValue, signal }) => {
  try {
    return await authService.login(input, { signal });
  } catch (error) {
    return rejectWithValue(toApiErrorPayload(error));
  }
});

export const registerUser = createAsyncThunk<
  AuthUser,
  RegisterInput,
  AuthThunkConfig
>("auth/register", async (input, { rejectWithValue, signal }) => {
  try {
    return await authService.register(input, { signal });
  } catch (error) {
    return rejectWithValue(toApiErrorPayload(error));
  }
});

export const restoreSession = createAsyncThunk<
  AuthUser,
  void,
  AuthThunkConfig & { state: RootState }
>(
  "auth/restoreSession",
  async (_, { rejectWithValue, signal }) => {
    try {
      return await authService.getCurrentUser({ signal });
    } catch (error) {
      return rejectWithValue(toApiErrorPayload(error));
    }
  },
  {
    condition: (_, { getState }) => {
      const { initialized, status } = getState().auth;
      return !initialized && status !== "loading";
    },
  },
);

export const logoutUser = createAsyncThunk<void, void, AuthThunkConfig>(
  "auth/logout",
  async (_, { rejectWithValue, signal }) => {
    try {
      await authService.logout({ signal });
    } catch (error) {
      return rejectWithValue(toApiErrorPayload(error));
    }
  },
);
