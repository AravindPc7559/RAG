import type { ApiErrorPayload } from "@/services/apiErrors";
import type { AsyncStatus } from "@/shared/types/asyncState";

export type UserRole = "admin" | "member" | "viewer";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}

export interface AuthState {
  user: AuthUser | null;
  status: AsyncStatus;
  initialized: boolean;
  error: ApiErrorPayload | null;
}
