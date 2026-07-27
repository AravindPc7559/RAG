import type { AuthenticatedPrincipal } from "../../modules/auth/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedPrincipal;
      validated?: {
        body?: unknown;
        params?: unknown;
        query?: unknown;
      };
    }
  }
}

export {};
