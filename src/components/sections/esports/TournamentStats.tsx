import { cn } from "@/lib/cn";
import type { EsportsStat } from "@/config/esports";

export interface TournamentStatsProps {
  stats: EsportsStat[];
  className?: string;
}

export function TournamentStats({ stats, className }: TournamentStatsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6",
        className,
      )}
      aria-label="Tournament statistics"
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col gap-1 rounded-xl border border-border-interactive/50 bg-surface-elevated/80 px-4 py-5 text-center backdrop-blur-sm sm:px-6 sm:py-6"
        >
          <span className="text-h2 font-bold text-brand-primary">{stat.value}</span>
          <span className="text-label font-semibold tracking-[0.15em] text-text-secondary">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
