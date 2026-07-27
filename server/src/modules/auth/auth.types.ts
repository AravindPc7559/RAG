import type { UserRole } from "../users/user.types.js";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticatedPrincipal {
  id: string;
  email: string;
  role: UserRole;
}

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}

export interface AuthResult {
  user: AuthUser;
  token: string;
}
