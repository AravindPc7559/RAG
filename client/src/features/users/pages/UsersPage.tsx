import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  selectUsers,
  selectUsersError,
  selectUsersStatus,
} from "@/features/users/store/usersSelectors";
import { fetchUsers } from "@/features/users/store/usersThunks";

export function UsersPage() {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectUsers);
  const status = useAppSelector(selectUsersStatus);
  const error = useAppSelector(selectUsersError);

  useEffect(() => {
    if (status === "idle") {
      void dispatch(fetchUsers());
    }
  }, [dispatch, status]);

  return (
    <section>
      <header className="page-heading">
        <div>
          <span className="eyebrow">Directory</span>
          <h1>Users</h1>
          <p>Account access and workspace membership.</p>
        </div>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => void dispatch(fetchUsers())}
          disabled={status === "loading"}
        >
          {status === "loading" ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <div className="panel">
        {status === "loading" && users.length === 0 ? (
          <div className="panel-state" role="status">
            <span className="spinner" aria-hidden="true" />
            Loading users…
          </div>
        ) : null}

        {status === "failed" ? (
          <div className="panel-state panel-state--error" role="alert">
            <strong>Users could not be loaded.</strong>
            <span>{error?.message}</span>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => void dispatch(fetchUsers())}
            >
              Try again
            </button>
          </div>
        ) : null}

        {status === "succeeded" && users.length === 0 ? (
          <div className="panel-state">
            <strong>No users found.</strong>
            <span>Workspace users will appear here.</span>
          </div>
        ) : null}

        {users.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <span className="table-secondary">{user.email}</span>
                    </td>
                    <td className="capitalize">{user.role}</td>
                    <td>
                      <span className={`status status--${user.status}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                      }).format(new Date(user.createdAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
