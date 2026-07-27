import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { paths } from "@/app/router/paths";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  restoreSession,
  selectAuthInitialized,
  selectIsAuthenticated,
} from "@/features/auth";
import { FullPageLoader } from "@/shared/components/FullPageLoader";

export function ProtectedRoute() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const initialized = useAppSelector(selectAuthInitialized);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!initialized) {
      void dispatch(restoreSession());
    }
  }, [dispatch, initialized]);

  if (!initialized) {
    return <FullPageLoader label="Restoring your session" />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={paths.login}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}
