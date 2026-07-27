interface FullPageLoaderProps {
  label?: string;
}

export function FullPageLoader({
  label = "Loading application",
}: FullPageLoaderProps) {
  return (
    <div className="full-page-state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}
