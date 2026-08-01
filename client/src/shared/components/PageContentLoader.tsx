interface PageContentLoaderProps {
  label?: string;
}

export function PageContentLoader({
  label = "Loading",
}: PageContentLoaderProps) {
  return (
    <div className="page-content-loader" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}
