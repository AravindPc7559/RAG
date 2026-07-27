import type { RootState } from "@/app/store/store";

export const selectUsers = (state: RootState) => state.users.items;
export const selectUsersStatus = (state: RootState) => state.users.status;
export const selectUsersError = (state: RootState) => state.users.error;
export const selectActiveUserCount = (state: RootState) =>
  state.users.items.filter((user) => user.status === "active").length;
