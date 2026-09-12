"use client";

import { cn } from "@/lib/cn";

export type FixtureTabOption<T extends string> = {
  id: T;
  label: string;
  count?: number;
};

export function FixtureTabGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: FixtureTabOption<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface-muted p-1"
    >
      {options.map((option) => {
        const selected = option.id === value;
        const tabLabel =
          option.count != null ? `${option.label} (${option.count})` : option.label;

        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            id={`${label.replace(/\s+/g, "-").toLowerCase()}-${option.id}`}
            aria-selected={selected}
            aria-controls={`${label.replace(/\s+/g, "-").toLowerCase()}-panel-${option.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.id)}
            className={cn(
              "min-h-11 flex-1 rounded-lg px-3 py-2 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected
                ? "bg-surface-elevated text-text-primary shadow-sm"
                : "text-text-secondary hover:bg-surface-elevated/70 hover:text-text-primary",
            )}
          >
            {tabLabel}
          </button>
        );
      })}
    </div>
  );
}
