export const paths = {
  dashboard: "/",
  chat: "/chat/:documentId",
  documents: "/documents",
  github: "/github",
  login: "/login",
  register: "/register",
} as const;

export function createChatPath(documentId: string) {
  return `/chat/${encodeURIComponent(documentId)}`;
}
