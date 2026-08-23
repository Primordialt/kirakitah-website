"use client";

import { esportsRulesSections } from "@/config/esports";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useEffect, useState } from "react";

export function RulesNavigation() {
  const [activeId, setActiveId] = useState<string>(esportsRulesSections[0]?.id ?? "");

  useEffect(() => {
    const sections = esportsRulesSections
      .map((section) => document.getElementById(section.id))
      .filter(Boolean) as HTMLElement[];

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActiveId(visible.target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5] },
    );

    for (const section of sections) {
      observer.observe(section);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Rules sections"
      className="hidden lg:block lg:sticky lg:top-28 lg:self-start"
    >
      <p className="text-label font-semibold tracking-[0.12em] text-text-muted">
        ON THIS PAGE
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {esportsRulesSections.map((section) => (
          <li key={section.id}>
            <Link
              href={`#${section.id}`}
              className={cn(
                "block rounded-md px-3 py-2 text-body-sm transition-standard transition-colors",
                activeId === section.id
                  ? "bg-brand-primary/15 text-text-primary"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              {section.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function RulesContent() {
  return (
    <div className="flex flex-col gap-10">
      {esportsRulesSections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="scroll-mt-28"
          aria-labelledby={`${section.id}-heading`}
        >
          <h2
            id={`${section.id}-heading`}
            className="text-h3 text-text-primary"
          >
            {section.title}
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {section.content.map((paragraph) => (
              <p key={paragraph} className="text-body text-text-secondary">
                {paragraph}
              </p>
            ))}
            {section.pending && (
              <p className="text-body-sm italic text-text-muted">
                Detailed rules will be published once finalized.
              </p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
