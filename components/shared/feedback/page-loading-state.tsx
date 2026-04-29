type PageLoadingStateProps = {
  label: string;
};

export function PageLoadingState({label}: PageLoadingStateProps) {
  return (
    <main id="main-content" className="aurevia-section">
      <div
        aria-live="polite"
        className="mx-auto max-w-6xl space-y-6"
        role="status"
      >
        <span className="sr-only">{label}</span>
        <div className="h-5 w-40 animate-pulse rounded-full bg-muted" />
        <div className="h-12 w-full max-w-2xl animate-pulse rounded-lg bg-muted/80" />
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="space-y-4 rounded-lg border border-border/70 bg-card/70 p-5 shadow-soft">
            <div className="h-5 w-28 animate-pulse rounded-full bg-muted" />
            <div className="space-y-3">
              <div className="h-11 animate-pulse rounded-lg bg-muted/80" />
              <div className="h-11 animate-pulse rounded-lg bg-muted/80" />
              <div className="h-11 animate-pulse rounded-lg bg-muted/80" />
            </div>
          </div>
          <div className="space-y-4 rounded-lg border border-border/70 bg-card/70 p-5 shadow-soft">
            <div className="h-6 w-52 animate-pulse rounded-full bg-muted" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-40 animate-pulse rounded-lg bg-muted/80" />
              <div className="h-40 animate-pulse rounded-lg bg-muted/80" />
            </div>
            <div className="h-28 animate-pulse rounded-lg bg-muted/70" />
          </div>
        </div>
      </div>
    </main>
  );
}
