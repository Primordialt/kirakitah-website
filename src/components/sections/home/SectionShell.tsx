import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export interface SectionShellProps {
  id?: string;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  ariaLabelledby?: string;
}

export function SectionShell({
  id,
  children,
  className,
  containerClassName,
  ariaLabelledby,
}: SectionShellProps) {
  return (
    <section
      id={id}
      className={cn("py-16 md:py-24 lg:py-28", className)}
      aria-labelledby={ariaLabelledby}
    >
      <div className={cn("container-content", containerClassName)}>
        {children}
      </div>
    </section>
  );
}
