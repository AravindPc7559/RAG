import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { paths } from "@/app/router/paths";
import { FullPageLoader } from "@/shared/components/FullPageLoader";
import { PublicOnlyRoute } from "@/shared/routes/PublicOnlyRoute";
import { ProtectedRoute } from "@/shared/routes/ProtectedRoute";
import { AppShell } from "@/shared/components/AppShell";

const DashboardPage = lazy(() =>
  import("@/features/dashboard").then((module) => ({
    default: module.DashboardPage,
  })),
);
const DocumentChat = lazy(() =>
  import("@/features/chat").then((module) => ({
    default: module.DocumentChat,
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
const DocumentsPage = lazy(() =>
  import("@/features/documents").then((module) => ({
    default: module.DocumentsPage,
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

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path={paths.chat} element={<DocumentChat />} />
            <Route path={paths.documents} element={<DocumentsPage />} />
          </Route>
        </Route>

        <Route path="/dashboard" element={<Navigate to={paths.dashboard} replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
