import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { paths } from "@/app/router/paths";
import { routeModules } from "@/app/router/routeModules";
import { FullPageLoader } from "@/shared/components/FullPageLoader";
import { PublicOnlyRoute } from "@/shared/routes/PublicOnlyRoute";
import { ProtectedRoute } from "@/shared/routes/ProtectedRoute";
import { AppShell } from "@/shared/components/AppShell";

const DashboardPage = lazy(() =>
  routeModules.dashboard().then((module) => ({
    default: module.DashboardPage,
  })),
);
const DocumentChat = lazy(() =>
  routeModules.chat().then((module) => ({
    default: module.DocumentChat,
  })),
);
const LoginPage = lazy(() =>
  routeModules.login().then((module) => ({
    default: module.LoginPage,
  })),
);
const RegisterPage = lazy(() =>
  routeModules.register().then((module) => ({
    default: module.RegisterPage,
  })),
);
const DocumentsPage = lazy(() =>
  routeModules.documents().then((module) => ({
    default: module.DocumentsPage,
  })),
);
const GitHubPage = lazy(() =>
  routeModules.github().then((module) => ({
    default: module.GitHubPage,
  })),
);
const PullRequestsPage = lazy(() =>
  routeModules.review().then((module) => ({
    default: module.PullRequestsPage,
  })),
);
const PullRequestReviewPage = lazy(() =>
  routeModules.review().then((module) => ({
    default: module.PullRequestReviewPage,
  })),
);
const NotFoundPage = lazy(() =>
  routeModules.notFound().then((module) => ({
    default: module.NotFoundPage,
  })),
);

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route
          path={paths.login}
          element={
            <Suspense fallback={<FullPageLoader label="Loading page" />}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route
          path={paths.register}
          element={
            <Suspense fallback={<FullPageLoader label="Loading page" />}>
              <RegisterPage />
            </Suspense>
          }
        />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path={paths.chat} element={<DocumentChat />} />
          <Route path={paths.documents} element={<DocumentsPage />} />
          <Route path={paths.github} element={<GitHubPage />} />
          <Route path={paths.githubPulls} element={<PullRequestsPage />} />
          <Route
            path={paths.githubPullReview}
            element={<PullRequestReviewPage />}
          />
        </Route>
      </Route>

      <Route path="/dashboard" element={<Navigate to={paths.dashboard} replace />} />
      <Route
        path="*"
        element={
          <Suspense fallback={<FullPageLoader label="Loading page" />}>
            <NotFoundPage />
          </Suspense>
        }
      />
    </Routes>
  );
}
