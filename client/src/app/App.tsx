import { AppRouter } from "@/app/router/AppRouter";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";

export function App() {
  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
}
