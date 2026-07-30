export { LoginPage } from "@/features/auth/pages/LoginPage";
export { RegisterPage } from "@/features/auth/pages/RegisterPage";
export {
  selectAuthInitialized,
  selectAuthIsLoading,
  selectCurrentUser,
  selectIsAuthenticated,
} from "@/features/auth/store/authSelectors";
export { logoutUser, restoreSession } from "@/features/auth/store/authThunks";
export { addDocumentReference } from "@/features/auth/store/authSlice";
export type {
  AuthUser,
  LoginInput,
  RegisterInput,
  UserDocumentReference,
  UserRole,
} from "@/features/auth/types/auth.types";
