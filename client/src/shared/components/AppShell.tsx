import { Suspense, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { paths } from "@/app/router/paths";
import {
  prefetchAppShellRoutes,
  prefetchRoute,
} from "@/app/router/routeModules";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  logoutUser,
  selectAuthIsLoading,
  selectCurrentUser,
} from "@/features/auth";
import { PageContentLoader } from "@/shared/components/PageContentLoader";

const navigation = [
  {
    label: "Overview",
    to: paths.dashboard,
    end: true,
    prefetch: "dashboard" as const,
  },
  {
    label: "Document",
    to: paths.documents,
    end: false,
    prefetch: "documents" as const,
  },
  {
    label: "GitHub",
    to: paths.github,
    end: false,
    prefetch: "github" as const,
  },
];

export function AppShell() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const isAuthLoading = useAppSelector(selectAuthIsLoading);

  useEffect(() => {
    prefetchAppShellRoutes();
  }, []);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="brand-mark brand-mark--small">S</span>
          <div>
            <strong>SourceSense</strong>
            <span>Workspace</span>
          </div>
        </div>

        <nav aria-label="Primary navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? "nav-link nav-link--active" : "nav-link"
              }
              onMouseEnter={() => prefetchRoute(item.prefetch)}
              onFocus={() => prefetchRoute(item.prefetch)}
            >
              <span className="nav-link__dot" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="user-summary">
            <span>{currentUser?.name.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{currentUser?.name}</strong>
              <small>{currentUser?.role}</small>
            </div>
          </div>
          <button
            type="button"
            className="button button--ghost button--wide"
            disabled={isAuthLoading}
            onClick={() => void dispatch(logoutUser())}
          >
            {isAuthLoading ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="topbar__label">Environment</span>
            <strong>Development</strong>
          </div>
          <div className="topbar__identity">
            <span>{currentUser?.email}</span>
            <span className="status status--active">Connected</span>
          </div>
        </header>
        <main className="workspace__content">
          <Suspense fallback={<PageContentLoader label="Loading page" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
