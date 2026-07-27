import type { UserRole } from "@/features/auth";
import type { ApiErrorPayload } from "@/services/apiErrors";
import type { AsyncStatus } from "@/shared/types/asyncState";

export type UserStatus = "active" | "invited" | "disabled";

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UsersState {
  items: UserListItem[];
  status: AsyncStatus;
  error: ApiErrorPayload | null;
}
