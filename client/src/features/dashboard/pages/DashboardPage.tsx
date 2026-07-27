import { useAppSelector } from "@/app/store/hooks";
import { selectCurrentUser } from "@/features/auth";
import {
  selectActiveUserCount,
  selectUsers,
} from "@/features/users";

const architectureLayers = [
  {
    name: "Feature modules",
    detail: "UI, API services, thunks, slices, selectors, and types stay together.",
  },
  {
    name: "Application core",
    detail: "Routing, providers, and Redux store composition live in one place.",
  },
  {
    name: "Shared foundation",
    detail: "Reusable UI, API configuration, errors, and cross-feature types.",
  },
];

export function DashboardPage() {
  const currentUser = useAppSelector(selectCurrentUser);
  const users = useAppSelector(selectUsers);
  const activeUsers = useAppSelector(selectActiveUserCount);

  return (
    <section>
      <header className="page-heading">
        <div>
          <span className="eyebrow">Overview</span>
          <h1>Welcome, {currentUser?.name.split(" ")[0]}</h1>
          <p>Your scalable React foundation is ready for new business features.</p>
        </div>
      </header>

      <div className="stats-grid">
        <article className="stat-card">
          <span>Architecture</span>
          <strong>Feature-first</strong>
          <small>Clear ownership boundaries</small>
        </article>
        <article className="stat-card">
          <span>Async state</span>
          <strong>Redux thunks</strong>
          <small>Predictable request lifecycle</small>
        </article>
        <article className="stat-card">
          <span>Active users</span>
          <strong>{users.length > 0 ? activeUsers : "—"}</strong>
          <small>{users.length > 0 ? `${users.length} loaded` : "Open Users to load"}</small>
        </article>
      </div>

      <div className="panel architecture-panel">
        <div className="panel-heading">
          <span className="eyebrow">Project boundaries</span>
          <h2>Designed to scale without losing clarity</h2>
        </div>
        <div className="architecture-list">
          {architectureLayers.map((layer, index) => (
            <article key={layer.name}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{layer.name}</h3>
                <p>{layer.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
