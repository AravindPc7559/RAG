import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { paths } from "@/app/router/paths";
import { AppShell } from "@/shared/components/AppShell";
import { FullPageLoader } from "@/shared/components/FullPageLoader";
import { ProtectedRoute } from "@/shared/routes/ProtectedRoute";
import { PublicOnlyRoute } from "@/shared/routes/PublicOnlyRoute";

const DashboardPage = lazy(() =>
  import("@/features/dashboard").then((module) => ({
    default: module.DashboardPage,
  })),
);
const LoginPage = lazy(() =>
  import("@/features/auth").then((module) => ({
    default: module.LoginPage,
  })),
);
const RegisterPage = lazy(() =>
  import("@/features/auth").then((module) => ({
    default: module.RegisterPage,
  })),
);
const UsersPage = lazy(() =>
  import("@/features/users").then((module) => ({
    default: module.UsersPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("@/features/not-found").then((module) => ({
    default: module.NotFoundPage,
  })),
);

export function AppRouter() {
  return (
    <Suspense fallback={<FullPageLoader label="Loading page" />}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path={paths.login} element={<LoginPage />} />
          <Route path={paths.register} element={<RegisterPage />} />
        </Route>

        {/* <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}> */}
            <Route index element={<DashboardPage />} />
            <Route path={paths.users} element={<UsersPage />} />
          {/* </Route>
        </Route> */}

        <Route path="/dashboard" element={<Navigate to={paths.dashboard} replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
