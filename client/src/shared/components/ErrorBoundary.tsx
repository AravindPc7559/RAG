import { Component, type ErrorInfo, type PropsWithChildren } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  PropsWithChildren,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled React error", error, info);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="full-page-state">
          <h1>Something went wrong</h1>
          <p>Refresh the page and try again.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
