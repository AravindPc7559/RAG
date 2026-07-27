import type { RootState } from "@/app/store/store";

export const selectAuth = (state: RootState) => state.auth;
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.user !== null;
export const selectAuthInitialized = (state: RootState) =>
  state.auth.initialized;
export const selectAuthIsLoading = (state: RootState) =>
  state.auth.status === "loading";
export const selectAuthError = (state: RootState) => state.auth.error;
