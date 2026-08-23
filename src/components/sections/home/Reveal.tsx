"use client";

import { cn } from "@/lib/cn";
import { useEffect, useRef, useState, type ReactNode } from "react";

export interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "motion-safe:transition-all motion-safe:duration-[var(--duration-slow)] motion-safe:ease-[var(--ease-out)]",
        visible
          ? "motion-safe:translate-y-0 motion-safe:opacity-100"
          : "motion-safe:translate-y-6 motion-safe:opacity-0",
        className,
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : undefined }}
    >
      {children}
    </div>
  );
}
