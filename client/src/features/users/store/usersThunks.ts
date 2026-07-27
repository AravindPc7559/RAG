import { createAsyncThunk } from "@reduxjs/toolkit";

import type { RootState } from "@/app/store/store";
import { usersService } from "@/features/users/api/usersService";
import type { UserListItem } from "@/features/users/types/users.types";
import {
  toApiErrorPayload,
  type ApiErrorPayload,
} from "@/services/apiErrors";

export const fetchUsers = createAsyncThunk<
  UserListItem[],
  void,
  { state: RootState; rejectValue: ApiErrorPayload }
>(
  "users/fetchUsers",
  async (_, { rejectWithValue, signal }) => {
    try {
      return await usersService.list({ signal });
    } catch (error) {
      return rejectWithValue(toApiErrorPayload(error));
    }
  },
  {
    condition: (_, { getState }) => getState().users.status !== "loading",
  },
);
