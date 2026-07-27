import { Link } from "react-router-dom";

import { paths } from "@/app/router/paths";

export function NotFoundPage() {
  return (
    <main className="full-page-state">
      <span className="eyebrow">404</span>
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <Link className="button button--primary" to={paths.dashboard}>
        Return home
      </Link>
    </main>
  );
}
