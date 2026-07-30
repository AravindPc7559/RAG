import type { UserDocument } from "../users/user.model.js";
import type { AuthUser } from "./auth.types.js";

export function toAuthUser(user: UserDocument): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    documentUrls: (user.documentUrls ?? []).map((document) => ({
      ...(document.documentId
        ? { documentId: document.documentId }
        : {}),
      ...(document.fileName ? { fileName: document.fileName } : {}),
      publicId: document.publicId,
      url: document.url,
    })),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
