import { NavLink, Outlet } from "react-router-dom";

import { paths } from "@/app/router/paths";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  logoutUser,
  selectAuthIsLoading,
  selectCurrentUser,
} from "@/features/auth";

const navigation = [
  { label: "Overview", to: paths.dashboard, end: true },
  { label: "Users", to: paths.users, end: false },
];

export function AppShell() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const isAuthLoading = useAppSelector(selectAuthIsLoading);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="brand-mark brand-mark--small">R</span>
          <div>
            <strong>RAG</strong>
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
