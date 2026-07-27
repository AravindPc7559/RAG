import type { UserDocument } from "./user.model.js";
import type { UserView } from "./user.types.js";

export function toUserView(user: UserDocument): UserView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
