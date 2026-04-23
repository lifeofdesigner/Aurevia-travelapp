type SkipLinkProps = {
  label: string;
};

export function SkipLink({label}: SkipLinkProps) {
  return (
    <a
      href="#main-content"
      className="sr-only z-[60] rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      {label}
    </a>
  );
}
