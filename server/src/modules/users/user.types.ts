export const userRoles = ["admin", "member", "viewer"] as const;
export type UserRole = (typeof userRoles)[number];

export const userStatuses = ["active", "invited", "disabled"] as const;
export type UserStatus = (typeof userStatuses)[number];

export interface UserView {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface ListUsersFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}
