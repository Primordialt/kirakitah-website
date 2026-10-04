import Link from "next/link";

export function AdminDashboardStatCard({
  href,
  label,
  value,
  hint,
}: {
  href: string;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[7rem] flex-col justify-between rounded-xl border border-border bg-surface-elevated p-4 text-left transition-colors hover:border-border-interactive hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-body-sm text-text-muted">{label}</p>
        <span
          className="text-text-muted transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5"
          aria-hidden
        >
          →
        </span>
      </div>
      <div>
        <p className="text-h2 text-text-primary">{value}</p>
        {hint ? (
          <p className="mt-1 text-caption text-text-secondary">{hint}</p>
        ) : null}
      </div>
    </Link>
  );
}
