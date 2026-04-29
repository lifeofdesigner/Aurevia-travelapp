import Link from "next/link";
import {ChevronRight} from "lucide-react";
import {type ReactNode} from "react";

type BreadcrumbItem = {
  href?: string;
  label: string;
};

type AdminPageHeaderProps = {
  actions?: ReactNode;
  breadcrumbs: BreadcrumbItem[];
  description: string;
  eyebrow?: string;
  title: string;
};

export function AdminPageHeader({
  actions,
  breadcrumbs,
  description,
  eyebrow,
  title
}: AdminPageHeaderProps) {
  return (
    <section className="space-y-4">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {breadcrumbs.map((item, index) => (
          <span key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 ? <ChevronRight aria-hidden="true" className="h-4 w-4" /> : null}
            {item.href ? (
              <Link className="transition-colors hover:text-foreground" href={item.href}>
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground">{item.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          {eyebrow ? (
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              {eyebrow}
            </p>
          ) : null}
          <div className="space-y-2">
            <h1 className="font-display text-3xl tracking-[0.01em] text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </section>
  );
}
