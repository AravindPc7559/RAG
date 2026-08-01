export const routeModules = {
  dashboard: () => import("@/features/dashboard"),
  chat: () => import("@/features/chat"),
  login: () => import("@/features/auth"),
  register: () => import("@/features/auth"),
  documents: () => import("@/features/documents"),
  github: () => import("@/features/github"),
  review: () => import("@/features/review"),
  notFound: () => import("@/features/not-found"),
} as const;

const prefetched = new Set<keyof typeof routeModules>();

export function prefetchRoute(moduleKey: keyof typeof routeModules) {
  if (prefetched.has(moduleKey)) {
    return;
  }

  prefetched.add(moduleKey);
  void routeModules[moduleKey]();
}

export function prefetchAppShellRoutes() {
  prefetchRoute("dashboard");
  prefetchRoute("documents");
  prefetchRoute("github");
  prefetchRoute("chat");
  prefetchRoute("review");
}
