import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { paths } from "@/app/router/paths";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  restoreSession,
  selectAuthInitialized,
  selectIsAuthenticated,
} from "@/features/auth";
import { FullPageLoader } from "@/shared/components/FullPageLoader";

export function PublicOnlyRoute() {
  const dispatch = useAppDispatch();
  const initialized = useAppSelector(selectAuthInitialized);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!initialized) {
      void dispatch(restoreSession());
    }
  }, [dispatch, initialized]);

  if (!initialized) {
    return <FullPageLoader label="Checking your session" />;
  }

  return isAuthenticated ? <Navigate to={paths.dashboard} replace /> : <Outlet />;
}
