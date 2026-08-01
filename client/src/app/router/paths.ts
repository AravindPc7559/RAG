export const paths = {
  dashboard: "/",
  chat: "/chat/:documentId",
  documents: "/documents",
  login: "/login",
  register: "/register",
  users: "/users",
} as const;

export function createChatPath(documentId: string) {
  return `/chat/${encodeURIComponent(documentId)}`;
}
