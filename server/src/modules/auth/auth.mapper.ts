import type { UserDocument } from "../users/user.model.js";
import type { AuthUser } from "./auth.types.js";

export function toAuthUser(user: UserDocument): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
